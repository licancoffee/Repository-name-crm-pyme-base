import { lineStockUnits } from "../calc";
import type { Customer, Sale } from "../types";

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

export function buildErpSalePayload(
  sale: Sale,
  customer?: Customer | null,
): ErpSalePayload {
  const subtotal = sale.lines.reduce(
    (acc, line) => acc + line.price * line.qty,
    0,
  );

  const items: ErpSaleItem[] = sale.lines.map((line) => {
    const bruto = line.price * line.qty;

    const descuentoLinea =
      subtotal > 0
        ? Math.round(
            (bruto / subtotal) *
              (sale.discountAmount || 0),
          )
        : 0;

    const subtotalLinea = Math.max(
      0,
      Math.round(bruto - descuentoLinea),
    );

    return {
      codigo: line.productId,
      producto: line.name,
      formato: line.format,
      cantidad: line.qty,
      unidades: lineStockUnits(line),
      precioUnitario: line.price,
      descuento: descuentoLinea,
      subtotal: subtotalLinea,
    };
  });

  return {
    action: "registrarVenta",

    ventaId: sale.id,
    fecha: sale.dateISO,

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
        customer?.address || "",

      tipoCliente:
        customer?.priceType ||
        sale.priceType ||
        "",

      observacion:
        customer?.note || "",
    },

    formaPago: sale.payment || "",
    observacion: sale.note || "",

    items,
  };
}

export function buildErpCancelPayload(
  ventaId: string,
): ErpCancelPayload {
  return {
    action: "anularVenta",
    ventaId,
  };
}
