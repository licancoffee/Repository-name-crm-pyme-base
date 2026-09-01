import {
    createFileRoute,
  } from "@tanstack/react-router";
  
  import {
    validateProductDrafts,
  } from "@/lib/setup/products";
  
  import {
    saveSetupProducts,
  } from "@/lib/setup/products-storage.server";
  
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
  
      const drafts =
        Array.isArray(
          body?.products,
        )
          ? body.products
          : [];
  
      const validation =
        validateProductDrafts(
          drafts,
        );
  
      if (!validation.ok) {
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
        await saveSetupProducts(
          validation.products,
        );
  
      return jsonResponse({
        ok: true,
        message:
          result.message,
        clientId:
          result.clientId,
        saved:
          result.saved,
        products:
          validation.products,
      });
    } catch (error) {
      console.error(
        "[SETUP PRODUCTS API ERROR]",
        error,
      );
  
      return jsonResponse(
        {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "No fue posible guardar el catálogo.",
        },
        500,
      );
    }
  }
  
  export const Route =
    createFileRoute(
      "/api/setup-products",
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
  