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
  try {
    const requestUrl =
      new URL(request.url);

    const requestedClientId =
      requestUrl.searchParams
        .get("clientId")
        ?.trim() ||
      process.env.CLIENT_ID ||
      "";

    if (!requestedClientId) {
      return jsonResponse(
        {
          ok: false,
          message:
            "No se pudo determinar el CLIENT_ID activo.",
        },
        400,
      );
    }

    const [
      config,
      products,
      customers,
    ] = await Promise.all([
      loadRemoteClientConfig(
        requestedClientId,
      ),
      readInstalledProducts(
        requestedClientId,
      ),
      readInstalledCustomers(
        requestedClientId,
      ),
    ]);

    if (
      config.configured === true &&
      config.clientId &&
      config.clientId !==
        requestedClientId
    ) {
      throw new Error(
        "La configuración remota pertenece a otro CLIENT_ID.",
      );
    }

    return jsonResponse({
      ok: true,
      configured:
        config.configured === true,
      clientId:
        requestedClientId,
      updatedAt:
        config.configured === true
          ? config.updatedAt || ""
          : "",
      config:
        config.configured === true
          ? config.config
          : null,
      products:
        products.products,
      customers:
        customers.customers,
      counts: {
        products:
          products.count,
        customers:
          customers.count,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible preparar el CRM para este cliente.",
      },
      500,
    );
  }
}

export const Route =
  createFileRoute(
    "/api/runtime-bootstrap",
  )({
    server: {
      handlers: {
        GET: ({ request }) =>
          handleGet(request),
      },
    },
  });
