import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  saveOperationalConnection,
} from "@/lib/setup/operational-connection.server";

import {
  verifyOperationalCredentials,
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

async function handlePost(
  request: Request,
) {
  try {
    const body =
      await request.json() as {
        clientId?: string;
        url?: string;
      };

    const clientId =
      String(body.clientId || "").trim();
    const url =
      String(body.url || "").trim();

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

    if (!url) {
      return jsonResponse(
        {
          ok: false,
          message:
            "Falta la URL operativa.",
        },
        400,
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return jsonResponse(
        {
          ok: false,
          message:
            "La URL operativa no es válida.",
        },
        400,
      );
    }

    if (
      parsedUrl.protocol !== "https:" ||
      !/script\.google\.com$/i.test(
        parsedUrl.hostname,
      ) ||
      !/\/exec\/?$/i.test(
        parsedUrl.pathname,
      )
    ) {
      return jsonResponse(
        {
          ok: false,
          message:
            "La URL debe ser una implementación /exec de Google Apps Script.",
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
          verification,
          message:
            verification.message ||
            "La conexión no pudo verificarse.",
        },
        400,
      );
    }

    await saveOperationalConnection({
      clientId,
      url,
    });

    return jsonResponse({
      ok: true,
      clientId,
      verification,
      message:
        "Conexión operativa verificada y guardada para esta empresa.",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible guardar la conexión operativa.",
      },
      500,
    );
  }
}

export const Route =
  createFileRoute(
    "/api/setup-operational-connection",
  )({
    server: {
      handlers: {
        POST: ({ request }) =>
          handlePost(request),
      },
    },
  });
