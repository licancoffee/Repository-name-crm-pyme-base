import { createServerFn } from "@tanstack/react-start";

import type {
  ErpSalePayload,
  ErpWriteResult,
} from "./payload";

/**
 * Registra una venta en el backend de integración.
 */
export const registrarVentaErp = createServerFn({
  method: "POST",
})
  .validator(
    (data: ErpSalePayload) =>
      data,
  )
  .handler(
    async ({
      data,
    }): Promise<ErpWriteResult> => {
      console.log(
        "[VENTA] Handler iniciado",
      );

      console.log(
        "[VENTA] Venta ID:",
        data.ventaId,
      );

      try {
        const {
          registrarVentaEnErp,
        } = await import(
          "./appsScript.server"
        );

        console.log(
          "[VENTA] Backend de integración cargado correctamente",
        );

        const result =
          await registrarVentaEnErp(
            data,
          );

        console.log(
          "[VENTA] Resultado:",
          JSON.stringify(
            result,
          ),
        );

        return result;
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

/**
 * Anula una venta y devuelve el stock correspondiente.
 */
export const anularVentaErp = createServerFn({
  method: "POST",
})
  .validator(
    (
      data: {
        ventaId: string;
      },
    ) => data,
  )
  .handler(
    async ({
      data,
    }): Promise<ErpWriteResult> => {
      console.log(
        "[ANULAR VENTA] Handler iniciado:",
        data.ventaId,
      );

      try {
        const {
          anularVentaEnErp,
        } = await import(
          "./appsScript.server"
        );

        const result =
          await anularVentaEnErp(
            data.ventaId,
          );

        console.log(
          "[ANULAR VENTA] Resultado:",
          JSON.stringify(
            result,
          ),
        );

        return result;
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
  