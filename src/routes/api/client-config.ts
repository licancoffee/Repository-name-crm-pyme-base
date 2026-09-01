import {
    createFileRoute,
  } from "@tanstack/react-router";
  
  import {
    loadRemoteClientConfig,
  } from "@/lib/setup/client-config.server";
  
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
    try {
      const result =
        await loadRemoteClientConfig();
  
      return jsonResponse(
        result,
      );
    } catch (error) {
      console.error(
        "[CLIENT CONFIG API ERROR]",
        error,
      );
  
      return jsonResponse(
        {
          ok: false,
          configured: false,
          message:
            error instanceof Error
              ? error.message
              : "No fue posible cargar la configuración.",
        },
        500,
      );
    }
  }
  
  export const Route =
    createFileRoute(
      "/api/client-config",
    )({
      server: {
        handlers: {
          GET: () =>
            handleGet(),
        },
      },
    });
  