import type {
  ErpCancelPayload,
  ErpSalePayload,
  ErpWriteResult,
} from "./payload";

/**
 * Cliente del backend ERP (Google Apps Script Web App).
 *
 * Variables requeridas:
 * - ERP_APPS_SCRIPT_URL
 * - CRM_API_TOKEN
 */
async function post(
  body: ErpSalePayload | ErpCancelPayload,
): Promise<ErpWriteResult> {
  const url = process.env["ERP_APPS_SCRIPT_URL"];
  const token = process.env["CRM_API_TOKEN"];

  if (!url) {
    return {
      ok: false,
      error: "SIN_ENDPOINT",
      mensaje:
        "Falta configurar la URL del backend del ERP (Apps Script).",
    };
  }

  if (!token) {
    return {
      ok: false,
      error: "SIN_TOKEN",
      mensaje:
        "Falta configurar CRM_API_TOKEN para escribir en el ERP.",
    };
  }

  const payloadConToken = {
    ...body,
    token,
  };

  let res: Response;

  try {
    res = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payloadConToken),
    });
  } catch (err) {
    console.error("ERP Apps Script fetch error", err);

    return {
      ok: false,
      error: "SIN_CONEXION",
      mensaje: "No se pudo contactar el ERP.",
    };
  }

  const text = await res.text();

  if (!res.ok) {
    console.error(
      `ERP Apps Script HTTP ${res.status}: ${text.slice(0, 500)}`,
    );

    return {
      ok: false,
      error: "ERROR_ERP",
      mensaje: `El ERP respondió con error ${res.status}.`,
    };
  }

  try {
    const respuesta = JSON.parse(text);

    /**
     * Respuesta normal del Apps Script:
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
     *
     * El "ok" está en el nivel exterior.
     * Lo incorporamos al resultado que recibe el CRM.
     */
    if (
      respuesta &&
      respuesta.ok === true &&
      respuesta.data &&
      typeof respuesta.data === "object"
    ) {
      return {
        ok: true,
        ...respuesta.data,
      } as ErpWriteResult;
    }

    /**
     * Error devuelto por Apps Script.
     */
    if (
      respuesta &&
      respuesta.ok === false
    ) {
      return {
        ok: false,
        error:
          respuesta.error ||
          "ERROR_ERP",
        mensaje:
          respuesta.mensaje ||
          respuesta.error ||
          "El ERP rechazó la operación.",
      };
    }

    /**
     * Compatibilidad si el backend devuelve
     * directamente un ErpWriteResult.
     */
    if (
      respuesta &&
      typeof respuesta === "object" &&
      typeof respuesta.ok === "boolean"
    ) {
      return respuesta as ErpWriteResult;
    }

    return {
      ok: false,
      error: "RESPUESTA_INVALIDA",
      mensaje:
        "El ERP respondió correctamente, pero el formato de la respuesta no fue reconocido.",
    };
  } catch (err) {
    console.error(
      `ERP Apps Script respuesta no JSON: ${text.slice(0, 500)}`,
      err,
    );

    return {
      ok: false,
      error: "RESPUESTA_INVALIDA",
      mensaje:
        "El ERP respondió en un formato inesperado.",
    };
  }
}

export function registrarVentaEnErp(
  payload: ErpSalePayload,
): Promise<ErpWriteResult> {
  return post(payload);
}

export function anularVentaEnErp(
  ventaId: string,
): Promise<ErpWriteResult> {
  return post({
    action: "anularVenta",
    ventaId,
  });
}
