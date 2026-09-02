type ErpPingResponse = {
  ok?: boolean;
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

export async function checkErpConnection(): Promise<ErpConnectionCheck> {
  const url =
    process.env.ERP_APPS_SCRIPT_URL ||
    "";

  const token =
    process.env.CRM_API_TOKEN ||
    "";

  const endpointConfigured =
    Boolean(url.trim());

  const tokenConfigured =
    Boolean(token.trim());

  if (!endpointConfigured || !tokenConfigured) {
    return {
      configured: false,
      reachable: false,
      ready: false,
      endpointConfigured,
      tokenConfigured,
      message:
        !endpointConfigured && !tokenConfigured
          ? "Faltan ERP_APPS_SCRIPT_URL y CRM_API_TOKEN."
          : !endpointConfigured
            ? "Falta ERP_APPS_SCRIPT_URL."
            : "Falta CRM_API_TOKEN.",
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
      ErpPingResponse | null =
      null;

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
