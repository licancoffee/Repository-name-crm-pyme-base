import type {
  ErpCancelPayload,
  ErpSalePayload,
  ErpWriteResult,
} from "./payload";

import {
  resolveOperationalConnection,
} from "@/lib/setup/operational-connection.server";

async function post(
  body:
    | ErpSalePayload
    | ErpCancelPayload,
  requestedClientId: string,
): Promise<ErpWriteResult> {
  const clientId =
    String(requestedClientId || "").trim();

  if (!clientId) {
    return {
      ok: false,
      error:
        "SIN_CLIENT_ID",
      mensaje:
        "No se pudo determinar la empresa activa para esta venta.",
    };
  }

  const connection =
    await resolveOperationalConnection(
      clientId,
    );

  if (!connection) {
    return {
      ok: false,
      error:
        "SIN_CONEXION_CLIENTE",
      mensaje:
        "Esta empresa no tiene una conexión operativa configurada.",
    };
  }

  if (connection.clientId !== clientId) {
    return {
      ok: false,
      error:
        "CLIENT_ID_INCORRECTO",
      mensaje:
        "La conexión operativa resuelta pertenece a otra empresa.",
    };
  }

  const payloadOperativo: Record<string, unknown> = {
    ...body,
    clientId,
  };

  if (connection.legacyToken) {
    payloadOperativo.token =
      connection.legacyToken;
  }

  let response: Response;

  try {
    response =
      await fetch(
        connection.url,
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
              payloadOperativo,
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
      `Apps Script HTTP ${response.status}: ${text.slice(0, 500)}`,
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
      JSON.parse(text);

    if (
      respuesta &&
      respuesta.clientId &&
      respuesta.clientId !== clientId
    ) {
      return {
        ok: false,
        error:
          "CLIENT_ID_INCORRECTO",
        mensaje:
          "El backend operativo respondió con otro CLIENT_ID.",
      };
    }

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
      `Apps Script response is not valid JSON: ${text.slice(0, 500)}`,
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
  clientId: string,
): Promise<ErpWriteResult> {
  return post(
    payload,
    clientId,
  );
}

export function anularVentaEnErp(
  ventaId: string,
  clientId: string,
): Promise<ErpWriteResult> {
  return post(
    {
      action:
        "anularVenta",
      ventaId,
    },
    clientId,
  );
}
