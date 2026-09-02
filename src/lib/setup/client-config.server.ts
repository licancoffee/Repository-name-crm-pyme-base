import type {
  ClientConfig,
} from "@/lib/config/client";

import {
  getServerActiveClientId,
} from "@/lib/config/active-client.server";

type RemoteConfigResponse = {
  ok?: boolean;
  message?: string;
  config?: ClientConfig;
  clientId?: string;
  status?: string;
  updatedAt?: string;
};

function getRemoteConfigSettings(
  clientIdOverride?: string,
) {
  const url =
    process.env.SETUP_STORAGE_URL ||
    process.env.ERP_APPS_SCRIPT_URL;

  const token =
    process.env.SETUP_STORAGE_TOKEN ||
    process.env.CRM_API_TOKEN;

  const clientId =
    getServerActiveClientId(
      clientIdOverride,
    );

  return {
    url,
    token,
    clientId,
  };
}

export async function loadRemoteClientConfig(
  clientIdOverride?: string,
) {
  const {
    url,
    token,
    clientId,
  } =
    getRemoteConfigSettings(
      clientIdOverride,
    );

  if (!clientId) {
    return {
      ok: true,
      configured: false,
      reason:
        "No se pudo determinar el CLIENT_ID activo.",
    } as const;
  }

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

  const endpoint =
    new URL(url);

  endpoint.searchParams.set(
    "action",
    "obtenerConfiguracionCliente",
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

  let result:
    RemoteConfigResponse;

  try {
    result = JSON.parse(
      text,
    ) as RemoteConfigResponse;
  } catch {
    throw new Error(
      "El backend del instalador devolvió una respuesta inválida.",
    );
  }

  if (
    !response.ok ||
    result.ok === false
  ) {
    throw new Error(
      result.message ||
        "No fue posible cargar la configuración del cliente.",
    );
  }

  if (!result.config) {
    throw new Error(
      "El cliente no tiene CONFIG_JSON guardado.",
    );
  }

  if (
    result.clientId &&
    result.clientId !== clientId
  ) {
    throw new Error(
      "La configuración recibida pertenece a otro CLIENT_ID.",
    );
  }

  return {
    ok: true,
    configured: true,
    clientId:
      result.clientId ||
      clientId,
    status:
      result.status || "",
    updatedAt:
      result.updatedAt || "",
    config:
      result.config,
  } as const;
}
