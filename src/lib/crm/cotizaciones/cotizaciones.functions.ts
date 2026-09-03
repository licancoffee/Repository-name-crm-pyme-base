import { createServerFn } from "@tanstack/react-start";

import {
  getActiveClientId,
} from "@/lib/config/active-client";

import {
  crearCotizacionEnAppsScript,
  listarCotizacionesEnAppsScript,
  buscarCotizacionEnAppsScript,
  marcarCotizacionConvertidaEnAppsScript,
} from "./appsScript.server";

import type {
  CrearCotizacionPayload,
  CrearCotizacionResult,
} from "./payload";

import type {
  ListarCotizacionesResult,
  BuscarCotizacionResult,
  MarcarCotizacionConvertidaResult,
} from "./appsScript.server";


type ClientContext = {
  clientId: string;
};

function requireActiveClientId() {
  const clientId =
    String(
      getActiveClientId() || "",
    ).trim();

  if (!clientId) {
    throw new Error(
      "No se pudo determinar el CLIENT_ID activo.",
    );
  }

  return clientId;
}


/*********************************************************
 * CREAR COTIZACIÓN
 *********************************************************/

const crearCotizacionServer = createServerFn({
  method: "POST",
})
  .validator(
    (input: {
      clientId: string;
      payload: CrearCotizacionPayload;
    }) => input,
  )
  .handler(
    async ({ data }): Promise<CrearCotizacionResult> => {
      return crearCotizacionEnAppsScript(
        data.payload,
        data.clientId,
      );
    },
  );

export async function crearCotizacion(
  input: {
    data: CrearCotizacionPayload;
  },
): Promise<CrearCotizacionResult> {
  return crearCotizacionServer({
    data: {
      clientId:
        requireActiveClientId(),
      payload: input.data,
    },
  });
}


/*********************************************************
 * LISTAR COTIZACIONES
 *********************************************************/

const listarCotizacionesServer = createServerFn({
  method: "POST",
})
  .validator(
    (input: ClientContext) =>
      input,
  )
  .handler(
    async ({ data }): Promise<ListarCotizacionesResult> => {
      return listarCotizacionesEnAppsScript(
        data.clientId,
      );
    },
  );

export async function listarCotizaciones(
  _input: {
    data?: {
      action?: string;
    };
  } = {},
): Promise<ListarCotizacionesResult> {
  return listarCotizacionesServer({
    data: {
      clientId:
        requireActiveClientId(),
    },
  });
}


/*********************************************************
 * BUSCAR COTIZACIÓN
 *********************************************************/

const buscarCotizacionServer = createServerFn({
  method: "POST",
})
  .validator(
    (input: {
      clientId: string;
      numero: string;
    }) => input,
  )
  .handler(
    async ({ data }): Promise<BuscarCotizacionResult> => {
      return buscarCotizacionEnAppsScript(
        data.numero,
        data.clientId,
      );
    },
  );

export async function buscarCotizacion(
  input: {
    data: {
      numero: string;
    };
  },
): Promise<BuscarCotizacionResult> {
  return buscarCotizacionServer({
    data: {
      clientId:
        requireActiveClientId(),
      numero:
        input.data.numero,
    },
  });
}


/*********************************************************
 * MARCAR COTIZACIÓN COMO CONVERTIDA
 *********************************************************/

const marcarCotizacionConvertidaServer =
  createServerFn({
    method: "POST",
  })
    .validator(
      (input: {
        clientId: string;
        numero: string;
        ventaId: string;
      }) => input,
    )
    .handler(
      async ({ data }): Promise<MarcarCotizacionConvertidaResult> => {
        return marcarCotizacionConvertidaEnAppsScript(
          data.numero,
          data.ventaId,
          data.clientId,
        );
      },
    );

export async function marcarCotizacionConvertida(
  input: {
    data: {
      numero: string;
      ventaId: string;
    };
  },
): Promise<MarcarCotizacionConvertidaResult> {
  return marcarCotizacionConvertidaServer({
    data: {
      clientId:
        requireActiveClientId(),
      numero:
        input.data.numero,
      ventaId:
        input.data.ventaId,
    },
  });
}
