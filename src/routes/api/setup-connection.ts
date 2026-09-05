import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  saveOperationalConnection,
} from "@/lib/setup/operational-connection.server";

import {
  verifyOperationalCredentials,
} from "@/lib/setup/erp-connection-check.server";

import {
  ACTIVE_CLIENT_COOKIE,
} from "@/lib/config/active-client.server";

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

async function handlePost(
  request: Request,
) {
  try {
    const body =
      await request.json();

    const clientId =
      String(
        body?.clientId || "",
      ).trim();
    const url =
      String(
        body?.url || "",
      ).trim();

    if (!clientId) {
      return jsonResponse(
        {
          ok: false,
          message:
            "Falta CLIENT_ID.",
        },
        400,
      );
    }

    if (
      !/^CL-[0-9K]+$/i.test(
        clientId,
      )
    ) {
      return jsonResponse(
        {
          ok: false,
          message:
            "CLIENT_ID inválido.",
        },
        400,
      );
    }

    if (
      !url.startsWith(
        "https://script.google.com/",
      ) ||
      !url.includes("/exec")
    ) {
      return jsonResponse(
        {
          ok: false,
          message:
            "La URL debe ser una Web App de Google Apps Script terminada en /exec.",
        },
        400,
      );
    }

    const verification =
      await verifyOperationalCredentials({
        clientId,
        url,
      });

    if (!verification.ready) {
      return jsonResponse(
        {
          ok: false,
          message:
            verification.message,
          verification,
        },
        400,
      );
    }

    await saveOperationalConnection({
      clientId,
      url,
    });

    return jsonResponse(
      {
        ok: true,
        clientId,
        message:
          "Conexión guardada y verificada correctamente.",
        verification,
      },
      200,
      clientId,
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible guardar la conexión.",
      },
      500,
    );
  }
}

export const Route =
  createFileRoute(
    "/api/setup-connection",
  )({
    server: {
      handlers: {
        POST: ({ request }) =>
          handlePost(request),
      },
    },
  });
