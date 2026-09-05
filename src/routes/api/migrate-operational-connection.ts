import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  resolveOperationalConnection,
  saveOperationalConnection,
} from "@/lib/setup/operational-connection.server";

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
      };

    const clientId =
      String(
        body.clientId || "",
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

    const connection =
      await resolveOperationalConnection(
        clientId,
      );

    if (!connection) {
      return jsonResponse(
        {
          ok: false,
          message:
            "No existe una conexión operativa disponible para migrar.",
        },
        400,
      );
    }

    if (
      connection.source ===
      "central"
    ) {
      return jsonResponse({
        ok: true,
        clientId,
        migrated: false,
        message:
          "La conexión ya está guardada en el instalador central.",
      });
    }

    await saveOperationalConnection({
      clientId,
      url: connection.url,
    });

    return jsonResponse({
      ok: true,
      clientId,
      migrated: true,
      message:
        "Conexión migrada al instalador central por CLIENT_ID y URL operativa.",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible migrar la conexión.",
      },
      500,
    );
  }
}

export const Route =
  createFileRoute(
    "/api/migrate-operational-connection",
  )({
    server: {
      handlers: {
        POST: ({ request }) =>
          handlePost(request),
      },
    },
  });
