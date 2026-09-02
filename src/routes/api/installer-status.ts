import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  loadRemoteClientConfig,
} from "@/lib/setup/client-config.server";

import {
  readInstalledProducts,
} from "@/lib/setup/products-read.server";

import {
  readInstalledCustomers,
} from "@/lib/setup/customers-read.server";

import {
  checkErpConnection,
} from "@/lib/setup/erp-connection-check.server";

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
      },
    },
  );
}

async function handleGet(
  request: Request,
) {
  const requestUrl =
    new URL(request.url);

  const requestedClientId =
    requestUrl.searchParams
      .get("clientId")
      ?.trim() || "";

  const clientId =
    requestedClientId ||
    process.env.CLIENT_ID ||
    "";

  const result = {
    ok: true,
    requestedClientId:
      clientId,
    config: {
      checked: false,
      completed: false,
      clientId: "",
      updatedAt: "",
      data: null as unknown,
      error: "",
    },
    products: {
      checked: false,
      completed: false,
      count: 0,
      error: "",
    },
    customers: {
      checked: false,
      completed: false,
      count: 0,
      verificationAvailable: true,
      message: "",
      error: "",
    },
    connection: {
      checked: false,
      configured: false,
      reachable: false,
      ready: false,
      endpointConfigured: false,
      tokenConfigured: false,
      message: "",
      source: "" as "" | "central" | "env",
    },
  };

  try {
    const config =
      await loadRemoteClientConfig(
        clientId || undefined,
      );

    result.config.checked = true;
    result.config.completed =
      config.configured === true;

    if (
      config.configured === true
    ) {
      result.config.clientId =
        config.clientId || "";
      result.config.updatedAt =
        config.updatedAt || "";
      result.config.data =
        config.config;
    }
  } catch (error) {
    result.config.checked = true;
    result.config.error =
      error instanceof Error
        ? error.message
        : "No fue posible revisar la configuración.";
  }

  try {
    const products =
      await readInstalledProducts(
        clientId || undefined,
      );

    result.products.checked = true;
    result.products.count =
      products.count;
    result.products.completed =
      products.count > 0;
  } catch (error) {
    result.products.checked = true;
    result.products.error =
      error instanceof Error
        ? error.message
        : "No fue posible revisar los productos.";
  }

  try {
    const customers =
      await readInstalledCustomers(
        clientId || undefined,
      );

    result.customers.checked = true;
    result.customers.count =
      customers.count;
    result.customers.completed =
      customers.count > 0;
    result.customers.message =
      customers.count > 0
        ? "Clientes verificados correctamente."
        : "No hay clientes iniciales guardados.";
  } catch (error) {
    result.customers.checked = true;
    result.customers.completed = false;
    result.customers.error =
      error instanceof Error
        ? error.message
        : "No fue posible revisar los clientes.";
    result.customers.message =
      "El backend todavía no pudo confirmar los clientes guardados.";
  }

  const connection =
    await checkErpConnection(
      clientId || undefined,
    );

  result.connection = {
    checked: true,
    configured:
      connection.configured,
    reachable:
      connection.reachable,
    ready:
      connection.ready,
    endpointConfigured:
      connection.endpointConfigured,
    tokenConfigured:
      connection.tokenConfigured,
    message:
      connection.message,
    source:
      connection.source || "",
  };

  const installationComplete =
    result.config.completed &&
    result.products.completed &&
    result.customers.completed;

  const operationalReady =
    installationComplete &&
    result.connection.ready;

  return jsonResponse({
    ...result,
    installationComplete,
    operationalReady,
  });
}

export const Route =
  createFileRoute(
    "/api/installer-status",
  )({
    server: {
      handlers: {
        GET: ({ request }) =>
          handleGet(request),
      },
    },
  });
