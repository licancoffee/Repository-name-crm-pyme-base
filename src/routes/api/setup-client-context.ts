import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  validateCustomerDrafts,
} from "@/lib/setup/customers";

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

function getStorageSettings() {
  const url =
    process.env.SETUP_STORAGE_URL;
  const token =
    process.env.SETUP_STORAGE_TOKEN;

  if (!url) {
    throw new Error(
      "SETUP_STORAGE_URL no configurado.",
    );
  }

  if (!token) {
    throw new Error(
      "SETUP_STORAGE_TOKEN no configurado.",
    );
  }

  return {
    url,
    token,
  };
}

async function getRemote(
  action: string,
  clientId: string,
) {
  const {
    url,
    token,
  } = getStorageSettings();

  const endpoint =
    new URL(url);

  endpoint.searchParams.set(
    "action",
    action,
  );
  endpoint.searchParams.set(
    "token",
    token,
  );
  endpoint.searchParams.set(
    "clientId",
    clientId,
  );

  const response =
    await fetch(
      endpoint.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
        cache: "no-store",
      },
    );

  const text =
    await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "El backend devolvió una respuesta inválida.",
    );
  }

  if (
    !response.ok ||
    data?.ok === false
  ) {
    throw new Error(
      data?.message ||
        "No fue posible leer la instalación.",
    );
  }

  if (
    data?.clientId &&
    data.clientId !== clientId
  ) {
    throw new Error(
      "El backend respondió con otro CLIENT_ID.",
    );
  }

  return data;
}

async function handleGet(
  request: Request,
) {
  try {
    const requestUrl =
      new URL(request.url);

    const clientId =
      requestUrl.searchParams
        .get("clientId")
        ?.trim() || "";

    if (!clientId) {
      return jsonResponse(
        {
          ok: false,
          message:
            "Falta clientId.",
        },
        400,
      );
    }

    const [
      configData,
      customerData,
    ] = await Promise.all([
      getRemote(
        "obtenerConfiguracionCliente",
        clientId,
      ),
      getRemote(
        "obtenerClientesCliente",
        clientId,
      ),
    ]);

    return jsonResponse({
      ok: true,
      clientId,
      companyName:
        configData?.config?.company?.name ||
        clientId,
      branding:
        configData?.config?.branding ||
        null,
      customers:
        Array.isArray(
          customerData?.customers,
        )
          ? customerData.customers
          : [],
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible cargar los clientes.",
      },
      500,
    );
  }
}

async function handlePost(
  request: Request,
) {
  try {
    const body =
      await request.json();

    const clientId =
      typeof body?.clientId ===
      "string"
        ? body.clientId.trim()
        : "";

    if (!clientId) {
      return jsonResponse(
        {
          ok: false,
          message:
            "Falta clientId.",
        },
        400,
      );
    }

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

    const {
      url,
      token,
    } = getStorageSettings();

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action:
              "guardarClientesCliente",
            token,
            clientId,
            customers:
              validation.customers,
          }),
        },
      );

    const text =
      await response.text();

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "El backend devolvió una respuesta inválida al guardar.",
      );
    }

    if (
      !response.ok ||
      data?.ok === false
    ) {
      throw new Error(
        data?.message ||
          "No fue posible guardar los clientes.",
      );
    }

    if (
      data?.clientId &&
      data.clientId !== clientId
    ) {
      throw new Error(
        "El backend guardó los clientes en otro CLIENT_ID.",
      );
    }

    return jsonResponse({
      ok: true,
      clientId,
      saved:
        typeof data?.saved ===
        "number"
          ? data.saved
          : validation.customers.length,
      message:
        data?.message ||
        "Clientes guardados correctamente.",
      customers:
        validation.customers,
    });
  } catch (error) {
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
    "/api/setup-client-context",
  )({
    server: {
      handlers: {
        GET: ({ request }) =>
          handleGet(request),
        POST: ({ request }) =>
          handlePost(request),
      },
    },
  });
