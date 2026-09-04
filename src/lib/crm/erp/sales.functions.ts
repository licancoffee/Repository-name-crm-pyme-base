import { createServerFn } from "@tanstack/react-start";

import {
  getActiveClientId,
} from "@/lib/config/active-client";

import type {
  ErpSalePayload,
  ErpWriteResult,
} from "./payload";

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

const registrarVentaErpServer = createServerFn({
  method: "POST",
})
  .validator(
    (input: {
      clientId: string;
      payload: ErpSalePayload;
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<ErpWriteResult> => {
      console.log(
        "[VENTA] Handler iniciado",
        data.clientId,
        data.payload.ventaId,
      );

      try {
        const {
          registrarVentaEnErp,
        } = await import(
          "./appsScript.server"
        );

        return await registrarVentaEnErp(
          data.payload,
          data.clientId,
        );
      } catch (error) {
        console.error(
          "[VENTA] Error interno:",
          error,
        );

        return {
          ok: false,
          error:
            "ERROR_SERVER_FN",
          mensaje:
            error instanceof Error
              ? error.message
              : "Error interno al registrar la venta.",
        };
      }
    },
  );

export async function registrarVentaErp(
  input: {
    data: ErpSalePayload;
  },
): Promise<ErpWriteResult> {
  return registrarVentaErpServer({
    data: {
      clientId:
        requireActiveClientId(),
      payload:
        input.data,
    },
  });
}

const anularVentaErpServer = createServerFn({
  method: "POST",
})
  .validator(
    (input: {
      clientId: string;
      ventaId: string;
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<ErpWriteResult> => {
      console.log(
        "[ANULAR VENTA] Handler iniciado:",
        data.clientId,
        data.ventaId,
      );

      try {
        const {
          anularVentaEnErp,
        } = await import(
          "./appsScript.server"
        );

        return await anularVentaEnErp(
          data.ventaId,
          data.clientId,
        );
      } catch (error) {
        console.error(
          "[ANULAR VENTA] Error interno:",
          error,
        );

        return {
          ok: false,
          error:
            "ERROR_SERVER_FN",
          mensaje:
            error instanceof Error
              ? error.message
              : "Error interno al anular la venta.",
        };
      }
    },
  );

export async function anularVentaErp(
  input: {
    data: {
      ventaId: string;
    };
  },
): Promise<ErpWriteResult> {
  return anularVentaErpServer({
    data: {
      clientId:
        requireActiveClientId(),
      ventaId:
        input.data.ventaId,
    },
  });
}
