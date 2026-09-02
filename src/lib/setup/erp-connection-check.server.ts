import {
  resolveOperationalConnection,
} from "./operational-connection.server";

type ErpPingResponse = {
  ok?: boolean;
  clientId?: string;
  mensaje?: string;
  message?: string;
  error?: string;
  data?: unknown;
};

export type ErpConnectionCheck = {
  configured: boolean;
  reachable: boolean;
  ready: boolean;
  endpointConfigured: boolean;
  tokenConfigured: boolean;
  message: string;
};

export async function verifyOperationalCredentials(
  input: {
    clientId: string;
    url: string;
    token: string;
  },
): Promise<ErpConnectionCheck> {
  const clientId =
    String(input.clientId || "").trim();
  const url =
    String(input.url || "").trim();
  const token =
    String(input.token || "").trim();

  const endpointConfigured =
    Boolean(url);
  const tokenConfigured =
    Boolean(token);

  if (!endpointConfigured || !tokenConfigured) {
    return {
      configured: false,
      reachable: false,
      ready: false,
      endpointConfigured,
      tokenConfigured,
      message:
        !endpointConfigured && !tokenConfigured
          ? "Faltan URL operativa y token."
          : !endpointConfigured
            ? "Falta la URL operativa."
            : "Falta el token operativo.",
    };
  }

  try {
    const response =
      await fetch(url, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "ping",
          token,
        }),
      });

    const text =
      await response.text();

    let payload:
      ErpPingResponse | null = null;

    try {
      payload =
        text
          ? JSON.parse(text) as ErpPingResponse
          : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        configured: true,
        reachable: false,
        ready: false,
        endpointConfigured: true,
        tokenConfigured: true,
        message:
          `El backend respondió HTTP ${response.status}.`,
      };
    }

    if (payload?.ok === false) {
      return {
        configured: true,
        reachable: true,
        ready: false,
        endpointConfigured: true,
        tokenConfigured: true,
        message:
          payload.mensaje ||
          payload.message ||
          payload.error ||
          "El backend rechazó la verificación.",
      };
    }

    if (payload?.ok === true) {
      if (
        clientId &&
        payload.clientId &&
        payload.clientId !== clientId
      ) {
        return {
          configured: true,
          reachable: true,
          ready: false,
          endpointConfigured: true,
          tokenConfigured: true,
          message:
            `El backend pertenece a ${payload.clientId}, no a ${clientId}.`,
        };
      }

      return {
        configured: true,
        reachable: true,
        ready: true,
        endpointConfigured: true,
        tokenConfigured: true,
        message:
          payload.mensaje ||
          payload.message ||
          "Conexión operativa verificada.",
      };
    }

    return {
      configured: true,
      reachable: true,
      ready: false,
      endpointConfigured: true,
      tokenConfigured: true,
      message:
        "El endpoint respondió, pero no confirmó el estado con ok:true.",
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      ready: false,
      endpointConfigured: true,
      tokenConfigured: true,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible contactar el backend operativo.",
    };
  }
}

export async function checkErpConnection(
  requestedClientId?: string,
): Promise<ErpConnectionCheck> {
  const connection =
    await resolveOperationalConnection(
      requestedClientId,
    );

  if (!connection) {
    return {
      configured: false,
      reachable: false,
      ready: false,
      endpointConfigured: false,
      tokenConfigured: false,
      message:
        "Esta empresa todavía no tiene una conexión operativa propia configurada.",
    };
  }

  return verifyOperationalCredentials({
    clientId:
      connection.clientId,
    url:
      connection.url,
    token:
      connection.token,
  });
}
