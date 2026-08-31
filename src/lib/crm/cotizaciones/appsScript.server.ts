import type {
  CrearCotizacionPayload,
  CrearCotizacionResult,
} from "./payload";


/*********************************************************
 * TIPOS PARA HISTORIAL DE COTIZACIONES
 *********************************************************/

export type CotizacionItem = {
  sku: string;
  producto: string;
  formato: string;
  cantidad: number;
  precioUnitario: number;
  moneda?: string;
};


export type CotizacionHistorial = {
  fila?: number;

  fecha?: string;
  numero: string;
  estado: string;

  cliente: string;
  empresa?: string;
  email?: string;
  telefono?: string;

  producto?: string;
  cantidad?: number;

  neto?: number;
  iva?: number;
  total?: number;

  pdfUrl?: string;
  documentoUrl?: string;
  docUrl?: string;

  origen?: string;
  mensaje?: string;

  items?: CotizacionItem[];

  descuento?: number;
  formaPago?: string;
  localidad?: string;
  direccion?: string;
  rutCliente?: string;
  observaciones?: string;

  ventaId?: string;
  fechaConversion?: string;
};


export type ListarCotizacionesResult =
  | {
      ok: true;
      cotizaciones: CotizacionHistorial[];
    }
  | {
      ok: false;
      error: string;
      mensaje: string;
    };


export type BuscarCotizacionResult =
  | {
      ok: true;
      cotizacion: CotizacionHistorial;
    }
  | {
      ok: false;
      error: string;
      mensaje: string;
    };


export type MarcarCotizacionConvertidaResult =
  | {
      ok: true;
      numero: string;
      estado: string;
      ventaId?: string;
      fechaConversion?: string;
      duplicada?: boolean;
    }
  | {
      ok: false;
      error: string;
      mensaje: string;
    };


/*********************************************************
 * CONFIGURACIÓN
 *********************************************************/

function obtenerConfiguracionCotizaciones() {
  /**
   * Cotizaciones y ERP utilizan actualmente
   * el mismo Web App de Google Apps Script.
   *
   * Fuente principal:
   * - ERP_APPS_SCRIPT_URL
   * - CRM_API_TOKEN
   *
   * Variables antiguas:
   * - COTIZACIONES_APPS_SCRIPT_URL
   * - CRM_COTIZACIONES_TOKEN
   *
   * quedan como respaldo.
   */

  const url =
    process.env["ERP_APPS_SCRIPT_URL"] ||
    process.env["COTIZACIONES_APPS_SCRIPT_URL"];

  const token =
    process.env["CRM_API_TOKEN"] ||
    process.env["CRM_COTIZACIONES_TOKEN"];

  return {
    url,
    token,
  };
}


/*********************************************************
 * POST GENÉRICO HACIA APPS SCRIPT
 *********************************************************/

async function postCotizacionesAppsScript(
  payload: Record<string, unknown>,
): Promise<
  | {
      ok: true;
      data: unknown;
    }
  | {
      ok: false;
      error: string;
      mensaje: string;
    }
> {
  const { url, token } =
    obtenerConfiguracionCotizaciones();

  if (!url) {
    return {
      ok: false,
      error: "SIN_ENDPOINT",
      mensaje:
        "Falta configurar ERP_APPS_SCRIPT_URL.",
    };
  }

  if (!token) {
    return {
      ok: false,
      error: "SIN_TOKEN",
      mensaje:
        "Falta configurar CRM_API_TOKEN.",
    };
  }

  const payloadConToken = {
    ...payload,
    token,
  };

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",
      },
      body: JSON.stringify(
        payloadConToken,
      ),
    });
  } catch (error) {
    console.error(
      "Cotizaciones Apps Script fetch error",
      error,
    );

    return {
      ok: false,
      error: "SIN_CONEXION",
      mensaje:
        "No se pudo contactar el sistema de cotizaciones.",
    };
  }

  const text =
    await response.text();

  if (!response.ok) {
    console.error(
      `Cotizaciones Apps Script HTTP ${response.status}: ${text.slice(
        0,
        500,
      )}`,
    );

    return {
      ok: false,
      error: "ERROR_HTTP",
      mensaje:
        "El sistema de cotizaciones respondió con error.",
    };
  }

  let respuesta: any;

  try {
    respuesta =
      JSON.parse(text);
  } catch (error) {
    console.error(
      "Respuesta no JSON de cotizaciones:",
      text.slice(0, 500),
      error,
    );

    return {
      ok: false,
      error: "RESPUESTA_INVALIDA",
      mensaje:
        "El sistema de cotizaciones respondió en un formato inesperado.",
    };
  }

  /**
   * Respuesta estándar del ERP:
   *
   * {
   *   ok: true,
   *   version: "...",
   *   data: ...
   * }
   */

  if (
    respuesta &&
    respuesta.ok === true
  ) {
    return {
      ok: true,
      data:
        respuesta.data !== undefined
          ? respuesta.data
          : respuesta,
    };
  }

  /**
   * Error estándar del ERP.
   */

  if (
    respuesta &&
    respuesta.ok === false
  ) {
    return {
      ok: false,
      error:
        respuesta.error ||
        "ERROR_COTIZACION",
      mensaje:
        respuesta.mensaje ||
        respuesta.error ||
        "La solicitud de cotizaciones fue rechazada.",
    };
  }

  return {
    ok: false,
    error: "RESPUESTA_INVALIDA",
    mensaje:
      "El sistema de cotizaciones respondió en un formato no reconocido.",
  };
}


/*********************************************************
 * CREAR COTIZACIÓN
 *********************************************************/

export async function crearCotizacionEnAppsScript(
  payload: CrearCotizacionPayload,
): Promise<CrearCotizacionResult> {

  const respuesta =
    await postCotizacionesAppsScript(
      payload as unknown as Record<
        string,
        unknown
      >,
    );

  if (!respuesta.ok) {
    return {
      ok: false,
      error: respuesta.error,
      mensaje: respuesta.mensaje,
    };
  }

  const data =
    respuesta.data as any;

  /**
   * La función crmCrearCotizacion_
   * devuelve:
   *
   * {
   *   ok: true,
   *   numero,
   *   estado,
   *   total,
   *   pdfUrl,
   *   documentoUrl,
   *   mensaje
   * }
   */

  if (
    data &&
    typeof data === "object"
  ) {
    return {
      ok: true,
      ...data,
    } as CrearCotizacionResult;
  }

  return {
    ok: false,
    error: "RESPUESTA_INVALIDA",
    mensaje:
      "No fue posible interpretar la cotización creada.",
  };
}


/*********************************************************
 * LISTAR COTIZACIONES
 *********************************************************/

export async function listarCotizacionesEnAppsScript():
Promise<ListarCotizacionesResult> {

  const respuesta =
    await postCotizacionesAppsScript({
      action:
        "listarCotizaciones",
    });

  if (!respuesta.ok) {
    return {
      ok: false,
      error: respuesta.error,
      mensaje: respuesta.mensaje,
    };
  }

  /**
   * crmListarCotizaciones_()
   * devuelve directamente un array.
   */

  const cotizaciones =
    Array.isArray(respuesta.data)
      ? respuesta.data
      : [];

  return {
    ok: true,
    cotizaciones:
      cotizaciones as CotizacionHistorial[],
  };
}


/*********************************************************
 * BUSCAR COTIZACIÓN POR NÚMERO
 *********************************************************/

export async function buscarCotizacionEnAppsScript(
  numero: string,
): Promise<BuscarCotizacionResult> {

  const numeroNormalizado =
    String(numero || "")
      .trim()
      .toUpperCase();

  if (!numeroNormalizado) {
    return {
      ok: false,
      error: "SIN_NUMERO",
      mensaje:
        "Debes indicar un número de cotización.",
    };
  }

  const respuesta =
    await postCotizacionesAppsScript({
      action:
        "buscarCotizacion",

      numero:
        numeroNormalizado,
    });

  if (!respuesta.ok) {
    return {
      ok: false,
      error: respuesta.error,
      mensaje: respuesta.mensaje,
    };
  }

  if (
    !respuesta.data ||
    typeof respuesta.data !==
      "object" ||
    Array.isArray(respuesta.data)
  ) {
    return {
      ok: false,
      error:
        "COTIZACION_NO_ENCONTRADA",
      mensaje:
        `No se encontró la cotización ${numeroNormalizado}.`,
    };
  }

  return {
    ok: true,
    cotizacion:
      respuesta.data as CotizacionHistorial,
  };
}


/*********************************************************
 * MARCAR COTIZACIÓN COMO CONVERTIDA
 *********************************************************/

export async function marcarCotizacionConvertidaEnAppsScript(
  numero: string,
  ventaId: string,
): Promise<MarcarCotizacionConvertidaResult> {

  const numeroNormalizado =
    String(numero || "")
      .trim()
      .toUpperCase();

  const ventaIdNormalizado =
    String(ventaId || "")
      .trim();

  if (!numeroNormalizado) {
    return {
      ok: false,
      error: "SIN_NUMERO",
      mensaje:
        "Falta el número de cotización.",
    };
  }

  if (!ventaIdNormalizado) {
    return {
      ok: false,
      error: "SIN_VENTA_ID",
      mensaje:
        "Falta el identificador de la venta.",
    };
  }

  const respuesta =
    await postCotizacionesAppsScript({
      action:
        "marcarCotizacionConvertida",

      numero:
        numeroNormalizado,

      ventaId:
        ventaIdNormalizado,
    });

  if (!respuesta.ok) {
    return {
      ok: false,
      error: respuesta.error,
      mensaje: respuesta.mensaje,
    };
  }

  const data =
    respuesta.data as any;

  if (
    !data ||
    typeof data !== "object"
  ) {
    return {
      ok: false,
      error:
        "RESPUESTA_INVALIDA",
      mensaje:
        "No fue posible confirmar la conversión de la cotización.",
    };
  }

  return {
    ok: true,
    numero:
      String(
        data.numero ||
        numeroNormalizado,
      ),

    estado:
      String(
        data.estado ||
        "CONVERTIDA",
      ),

    ventaId:
      String(
        data.ventaId ||
        ventaIdNormalizado,
      ),

    fechaConversion:
      data.fechaConversion
        ? String(
            data.fechaConversion,
          )
        : undefined,

    duplicada:
      Boolean(
        data.duplicada,
      ),
  };
}
