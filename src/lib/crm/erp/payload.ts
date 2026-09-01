import { lineStockUnits } from "../calc";

import type {
  Customer,
  Sale,
} from "../types";

export type ErpSaleItem = {
  codigo: string;
  producto: string;
  formato: string;
  cantidad: number;
  unidades: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
};

export type ErpSalePayload = {
  action: "registrarVenta";

  ventaId: string;

  fecha: string;

  cliente: {
    nombre: string;
    telefono: string;
    direccion: string;
    tipoCliente: string;
    observacion: string;
  };

  formaPago: string;

  observacion: string;

  items: ErpSaleItem[];
};

export type ErpCancelPayload = {
  action: "anularVenta";

  ventaId: string;
};

export type ErpWriteResult = {
  ok: boolean;

  duplicada?: boolean;

  ventaId?: string;

  mensaje?: string;

  error?: string;

  inventarioActualizado?: {
    codigo: string;
    producto: string;
    unidadesDescontadas: number;
    stockActual: number | null;
  }[];
};

/**
 * Construye el payload de una venta para la integración externa.
 *
 * Mantiene la estructura utilizada por Apps Script para registrar
 * la venta, actualizar inventario y guardar movimientos.
 */
export function buildErpSalePayload(
  sale: Sale,
  customer?: Customer | null,
): ErpSalePayload {
  const subtotal =
    sale.lines.reduce(
      (total, line) =>
        total +
        line.price *
          line.qty,
      0,
    );

  const items: ErpSaleItem[] =
    sale.lines.map(
      (line) => {
        const gross =
          line.price *
          line.qty;

        const lineDiscount =
          subtotal > 0
            ? Math.round(
                (
                  gross /
                  subtotal
                ) *
                  (
                    sale.discountAmount ||
                    0
                  ),
              )
            : 0;

        const lineSubtotal =
          Math.max(
            0,
            Math.round(
              gross -
                lineDiscount,
            ),
          );

        return {
          codigo:
            line.productId,

          producto:
            line.name,

          formato:
            line.format,

          cantidad:
            line.qty,

          unidades:
            lineStockUnits(
              line,
            ),

          precioUnitario:
            line.price,

          descuento:
            lineDiscount,

          subtotal:
            lineSubtotal,
        };
      },
    );

  return {
    action:
      "registrarVenta",

    ventaId:
      sale.id,

    fecha:
      sale.dateISO,

    cliente: {
      nombre:
        customer?.name ||
        sale.customerName ||
        "Sin cliente",

      telefono:
        customer?.phone ||
        sale.customerPhone ||
        "",

      direccion:
        customer?.address ||
        "",

      tipoCliente:
        customer?.priceType ||
        sale.priceType ||
        "",

      observacion:
        customer?.note ||
        "",
    },

    formaPago:
      sale.payment || "",

    observacion:
      sale.note || "",

    items,
  };
}

/**
 * Construye el payload necesario para anular una venta.
 */
export function buildErpCancelPayload(
  ventaId: string,
): ErpCancelPayload {
  return {
    action:
      "anularVenta",

    ventaId,
  };
}
