import { createServerFn } from "@tanstack/react-start";

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


/*********************************************************
 * CREAR COTIZACIÓN
 *********************************************************/

export const crearCotizacion = createServerFn({
  method: "POST",
})
  .validator(
    (payload: CrearCotizacionPayload) =>
      payload,
  )
  .handler(
    async ({
      data,
    }): Promise<CrearCotizacionResult> => {
      return crearCotizacionEnAppsScript(
        data,
      );
    },
  );


/*********************************************************
 * LISTAR COTIZACIONES
 *********************************************************/

export const listarCotizaciones = createServerFn({
  method: "POST",
})
  .validator(
    (
      payload: {
        action?: string;
      } = {},
    ) => payload,
  )
  .handler(
    async (): Promise<ListarCotizacionesResult> => {
      return listarCotizacionesEnAppsScript();
    },
  );


/*********************************************************
 * BUSCAR COTIZACIÓN
 *********************************************************/

export const buscarCotizacion = createServerFn({
  method: "POST",
})
  .validator(
    (payload: {
      numero: string;
    }) => payload,
  )
  .handler(
    async ({
      data,
    }): Promise<BuscarCotizacionResult> => {
      return buscarCotizacionEnAppsScript(
        data.numero,
      );
    },
  );


/*********************************************************
 * MARCAR COTIZACIÓN COMO CONVERTIDA
 *********************************************************/

export const marcarCotizacionConvertida =
  createServerFn({
    method: "POST",
  })
    .validator(
      (payload: {
        numero: string;
        ventaId: string;
      }) => payload,
    )
    .handler(
      async ({
        data,
      }): Promise<MarcarCotizacionConvertidaResult> => {
        return marcarCotizacionConvertidaEnAppsScript(
          data.numero,
          data.ventaId,
        );
      },
    );
    