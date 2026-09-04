import {
  getServerActiveClientId,
} from "@/lib/config/active-client.server";

export type OperationalConnection = {
  clientId: string;
  url: string;
  source: "central" | "env";
};

type RemoteConnectionResponse = {
  ok?: boolean;
  message?: string;
  clientId?: string;
  configured?: boolean;
  connection?: {
    url?: string;
  };
};

function getCentralStorageSettings() {
  return {
    url:
      process.env.SETUP_STORAGE_URL || "",
    token:
      process.env.SETUP_STORAGE_TOKEN || "",
  };
}

async function loadCentralConnection(
  clientId: string,
): Promise<OperationalConnection | null> {
  const central =
    getCentralStorageSettings();

  if (!central.url || !central.token) {
    return null;
  }

  const endpoint =
    new URL(central.url);

  endpoint.searchParams.set(
    "action",
    "obtenerConexionCliente",
  );
  endpoint.searchParams.set(
    "token",
    central.token,
  );
  endpoint.searchParams.set(
    "clientId",
    clientId,
  );

  const response =
    await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

  const text =
    await response.text();

  let result:
    RemoteConnectionResponse;

  try {
    result =
      JSON.parse(text) as
        RemoteConnectionResponse;
  } catch {
    throw new Error(
      "El instalador central devolvió una conexión operativa inválida.",
    );
  }

  if (!response.ok || result.ok === false) {
    const unsupported =
      /ACCION_NO_SOPORTADA|no soportada/i.test(
        String(result.message || text),
      );

    if (unsupported) {
      return null;
    }

    throw new Error(
      result.message ||
        "No fue posible consultar la conexión operativa del cliente.",
    );
  }

  if (
    result.clientId &&
    result.clientId !== clientId
  ) {
    throw new Error(
      "El instalador central respondió con una conexión de otro CLIENT_ID.",
    );
  }

  const url =
    String(
      result.connection?.url || "",
    ).trim();

  if (
    result.configured !== true ||
    !url
  ) {
    return null;
  }

  return {
    clientId,
    url,
    source: "central",
  };
}

function loadEnvConnection(
  clientId: string,
): OperationalConnection | null {
  const activeClientId =
    String(
      process.env.CLIENT_ID || "",
    ).trim();

  if (
    activeClientId &&
    clientId &&
    activeClientId !== clientId
  ) {
    return null;
  }

  const url =
    String(
      process.env.ERP_APPS_SCRIPT_URL ||
        process.env.COTIZACIONES_APPS_SCRIPT_URL ||
        "",
    ).trim();

  if (!url) {
    return null;
  }

  return {
    clientId:
      clientId || activeClientId,
    url,
    source: "env",
  };
}

export async function resolveOperationalConnection(
  requestedClientId?: string,
): Promise<OperationalConnection | null> {
  const clientId =
    getServerActiveClientId(
      requestedClientId,
    );

  if (!clientId) {
    return null;
  }

  try {
    const central =
      await loadCentralConnection(
        clientId,
      );

    if (central) {
      return central;
    }
  } catch (error) {
    console.error(
      "No fue posible resolver la conexión desde el instalador central.",
      error,
    );
  }

  return loadEnvConnection(
    clientId,
  );
}

export async function saveOperationalConnection(
  input: {
    clientId: string;
    url: string;
  },
) {
  const central =
    getCentralStorageSettings();

  if (!central.url) {
    throw new Error(
      "SETUP_STORAGE_URL no configurado.",
    );
  }

  if (!central.token) {
    throw new Error(
      "SETUP_STORAGE_TOKEN no configurado.",
    );
  }

  const response =
    await fetch(central.url, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        action:
          "guardarConexionCliente",
        token: central.token,
        clientId:
          input.clientId,
        connection: {
          url: input.url,
        },
      }),
    });

  const text =
    await response.text();

  let result: any;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      "El instalador central devolvió una respuesta inválida al guardar la conexión.",
    );
  }

  if (
    !response.ok ||
    result?.ok === false
  ) {
    throw new Error(
      result?.message ||
        "No fue posible guardar la conexión operativa.",
    );
  }

  if (
    result?.clientId &&
    result.clientId !==
      input.clientId
  ) {
    throw new Error(
      "El instalador central guardó la conexión bajo otro CLIENT_ID.",
    );
  }

  return {
    ok: true,
    clientId:
      input.clientId,
  };
}
