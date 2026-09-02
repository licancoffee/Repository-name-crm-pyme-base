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

async function handleGet() {
  const result = {
    ok: true,
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
    },
  };

  try {
    const config =
      await loadRemoteClientConfig();

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
      await readInstalledProducts();

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
      await readInstalledCustomers();

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
    await checkErpConnection();

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
        GET: () =>
          handleGet(),
      },
    },
  });
