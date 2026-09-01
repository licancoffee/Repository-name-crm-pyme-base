import {
    createFileRoute,
  } from "@tanstack/react-router";
  
  import {
    validateSetupConfig,
  } from "@/lib/setup/schema";
  
  import {
    saveSetupConfig,
  } from "@/lib/setup/storage.server";
  
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
        await request.json();
  
      const validation =
        validateSetupConfig(
          body,
        );
  
      if (
        !validation.ok
      ) {
        return jsonResponse(
          {
            ok: false,
            errors:
              validation.errors,
          },
          400,
        );
      }
  
      const result =
        await saveSetupConfig(
          validation.config,
        );
  
      return jsonResponse({
        ok: true,
        message:
          result.message,
        config:
          validation.config,
      });
    } catch (error) {
      console.error(
        "[SETUP API ERROR]",
        error,
      );
  
      const message =
        error instanceof Error
          ? error.message
          : "Error inesperado al guardar la configuración.";
  
      return jsonResponse(
        {
          ok: false,
          message,
        },
        500,
      );
    }
  }
  
  export const Route =
    createFileRoute(
      "/api/setup",
    )({
      server: {
        handlers: {
          POST: ({
            request,
          }) =>
            handlePost(
              request,
            ),
        },
      },
    });
  