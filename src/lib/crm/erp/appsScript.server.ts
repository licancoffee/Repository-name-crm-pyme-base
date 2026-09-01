import type {
  ErpCancelPayload,
  ErpSalePayload,
  ErpWriteResult,
} from "./payload";

/**
 * Cliente del backend de integración mediante Google Apps Script Web App.
 *
 * Variables requeridas:
 * - ERP_APPS_SCRIPT_URL
 * - CRM_API_TOKEN
 */
async function post(
  body:
    | ErpSalePayload
    | ErpCancelPayload,
): Promise<ErpWriteResult> {
  const url =
    process.env[
      "ERP_APPS_SCRIPT_URL"
    ];

  const token =
    process.env[
      "CRM_API_TOKEN"
    ];

  if (!url) {
    return {
      ok: false,
      error:
        "SIN_ENDPOINT",
      mensaje:
        "Falta configurar la URL del backend de integración.",
    };
  }

  if (!token) {
    return {
      ok: false,
      error:
        "SIN_TOKEN",
      mensaje:
        "Falta configurar CRM_API_TOKEN.",
    };
  }

  const payloadConToken = {
    ...body,
    token,
  };

  let response: Response;

  try {
    response =
      await fetch(
        url,
        {
          method:
            "POST",

          redirect:
            "follow",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8",
          },

          body:
            JSON.stringify(
              payloadConToken,
            ),
        },
      );
  } catch (error) {
    console.error(
      "Apps Script integration fetch error",
      error,
    );

    return {
      ok: false,
      error:
        "SIN_CONEXION",
      mensaje:
        "No se pudo contactar el sistema de integración.",
    };
  }

  const text =
    await response.text();

  if (!response.ok) {
    console.error(
      `Apps Script HTTP ${response.status}: ${text.slice(
        0,
        500,
      )}`,
    );

    return {
      ok: false,
      error:
        "ERROR_BACKEND",
      mensaje:
        `El sistema de integración respondió con error ${response.status}.`,
    };
  }

  try {
    const respuesta =
      JSON.parse(
        text,
      );

    /**
     * Respuesta normal esperada:
     *
     * {
     *   ok: true,
     *   version: "...",
     *   data: {
     *     ventaId: "...",
     *     estado: "ACTIVA",
     *     ...
     *   }
     * }
     */
    if (
      respuesta &&
      respuesta.ok === true &&
      respuesta.data &&
      typeof respuesta.data ===
        "object"
    ) {
      return {
        ok: true,
        ...respuesta.data,
      } as ErpWriteResult;
    }

    /**
     * Error devuelto por el backend.
     */
    if (
      respuesta &&
      respuesta.ok === false
    ) {
      return {
        ok: false,

        error:
          respuesta.error ||
          "ERROR_BACKEND",

        mensaje:
          respuesta.mensaje ||
          respuesta.error ||
          "El sistema rechazó la operación.",
      };
    }

    /**
     * Compatibilidad si el backend devuelve
     * directamente un ErpWriteResult.
     */
    if (
      respuesta &&
      typeof respuesta ===
        "object" &&
      typeof respuesta.ok ===
        "boolean"
    ) {
      return respuesta as ErpWriteResult;
    }

    return {
      ok: false,

      error:
        "RESPUESTA_INVALIDA",

      mensaje:
        "El sistema respondió correctamente, pero el formato de la respuesta no fue reconocido.",
    };
  } catch (error) {
    console.error(
      `Apps Script response is not valid JSON: ${text.slice(
        0,
        500,
      )}`,
      error,
    );

    return {
      ok: false,

      error:
        "RESPUESTA_INVALIDA",

      mensaje:
        "El sistema respondió en un formato inesperado.",
    };
  }
}

export function registrarVentaEnErp(
  payload: ErpSalePayload,
): Promise<ErpWriteResult> {
  return post(
    payload,
  );
}

export function anularVentaEnErp(
  ventaId: string,
): Promise<ErpWriteResult> {
  return post({
    action:
      "anularVenta",

    ventaId,
  });
}
