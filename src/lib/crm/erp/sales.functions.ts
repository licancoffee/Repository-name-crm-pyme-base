import { createServerFn } from "@tanstack/react-start";

import type {
  ErpSalePayload,
  ErpWriteResult,
} from "./payload";

/**
 * Registra una venta en el ERP real.
 */
export const registrarVentaErp = createServerFn({
  method: "POST",
})
  .validator((data: ErpSalePayload) => data)
  .handler(async ({ data }): Promise<ErpWriteResult> => {
    console.log("[VENTA ERP] Handler iniciado");
    console.log("[VENTA ERP] Venta ID:", data.ventaId);

    try {
      const { registrarVentaEnErp } = await import(
        "./appsScript.server"
      );

      console.log(
        "[VENTA ERP] appsScript.server cargado correctamente",
      );

      const result = await registrarVentaEnErp(data);

      console.log(
        "[VENTA ERP] Resultado:",
        JSON.stringify(result),
      );

      return result;
    } catch (error) {
      console.error(
        "[VENTA ERP] Error interno:",
        error,
      );

      return {
        ok: false,
        error: "ERROR_SERVER_FN",
        mensaje:
          error instanceof Error
            ? error.message
            : "Error interno al registrar la venta.",
      };
    }
  });

/**
 * Anula una venta en el ERP y devuelve el stock.
 */
export const anularVentaErp = createServerFn({
  method: "POST",
})
  .validator((data: { ventaId: string }) => data)
  .handler(async ({ data }): Promise<ErpWriteResult> => {
    console.log(
      "[ANULAR ERP] Handler iniciado:",
      data.ventaId,
    );

    try {
      const { anularVentaEnErp } = await import(
        "./appsScript.server"
      );

      const result = await anularVentaEnErp(
        data.ventaId,
      );

      console.log(
        "[ANULAR ERP] Resultado:",
        JSON.stringify(result),
      );

      return result;
    } catch (error) {
      console.error(
        "[ANULAR ERP] Error interno:",
        error,
      );

      return {
        ok: false,
        error: "ERROR_SERVER_FN",
        mensaje:
          error instanceof Error
            ? error.message
            : "Error interno al anular la venta.",
      };
    }
  });
  