import {
    createFileRoute,
  } from "@tanstack/react-router";
  
  import {
    validateCustomerDrafts,
  } from "@/lib/setup/customers";
  
  import {
    saveSetupCustomers,
  } from "@/lib/setup/customers-storage.server";
  
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
          body?.customers,
        )
          ? body.customers
          : [];
  
      const validation =
        validateCustomerDrafts(
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
        await saveSetupCustomers(
          validation.customers,
        );
  
      return jsonResponse({
        ok: true,
        message:
          result.message,
        clientId:
          result.clientId,
        saved:
          result.saved,
        customers:
          validation.customers,
      });
    } catch (error) {
      console.error(
        "[SETUP CUSTOMERS API ERROR]",
        error,
      );
  
      return jsonResponse(
        {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "No fue posible guardar los clientes.",
        },
        500,
      );
    }
  }
  
  export const Route =
    createFileRoute(
      "/api/setup-customers",
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
  