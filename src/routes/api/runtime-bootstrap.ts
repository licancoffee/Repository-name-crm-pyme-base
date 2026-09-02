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
  ACTIVE_CLIENT_COOKIE,
} from "@/lib/config/active-client.server";

function readCookie(
  request: Request,
  name: string,
) {
  const header =
    request.headers.get("cookie") || "";

  for (
    const part of header.split(/;\s*/)
  ) {
    const index =
      part.indexOf("=");

    if (index < 0) {
      continue;
    }

    if (
      part.slice(0, index) === name
    ) {
      return decodeURIComponent(
        part.slice(index + 1),
      );
    }
  }

  return "";
}

function clientIdFromReferer(
  request: Request,
) {
  const referer =
    request.headers.get("referer");

  if (!referer) {
    return "";
  }

  try {
    return (
      new URL(referer)
        .searchParams
        .get("clientId")
        ?.trim() || ""
    );
  } catch {
    return "";
  }
}

function jsonResponse(
  body: unknown,
  status = 200,
  clientId = "",
) {
  const headers =
    new Headers({
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control":
        "no-store",
    });

  if (clientId) {
    headers.append(
      "Set-Cookie",
      `${ACTIVE_CLIENT_COOKIE}=${encodeURIComponent(clientId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
    );
  }

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers,
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
      clientIdFromReferer(
        request,
      ) ||
      readCookie(
        request,
        ACTIVE_CLIENT_COOKIE,
      ).trim() ||
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

    return jsonResponse(
      {
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
      },
      200,
      requestedClientId,
    );
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
