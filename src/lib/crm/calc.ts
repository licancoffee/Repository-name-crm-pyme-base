import type {
  Customer,
  Product,
  ProductFormat,
  Sale,
  SaleLine,
} from "./types";

export const IVA = 1.19;

export function lineTotal(l: SaleLine) {
  return l.price * l.qty;
}

/** Unidades físicas de stock que consume una línea. */
export function lineStockUnits(l: SaleLine) {
  return l.qty * (l.formatUnits || 1);
}

export function saleTotals(
  lines: SaleLine[],
  discountType: "monto" | "porcentaje",
  discountValue: number,
) {
  const subtotal = lines.reduce((a, l) => a + lineTotal(l), 0);

  const rawDiscount =
    discountType === "porcentaje"
      ? (subtotal * (discountValue || 0)) / 100
      : discountValue || 0;

  const discountAmount = Math.min(
    Math.max(rawDiscount, 0),
    subtotal,
  );

  const total = subtotal - discountAmount;

  let netSale = 0;
  let cost = 0;

  for (const l of lines) {
    const share =
      subtotal > 0
        ? (lineTotal(l) / subtotal) * discountAmount
        : 0;

    netSale += (lineTotal(l) - share) / IVA;
    cost += l.netCost * l.qty;
  }

  const profit = netSale - cost;
  const margin = netSale > 0 ? profit / netSale : 0;

  return {
    subtotal,
    discountAmount,
    total,
    netSale,
    cost,
    profit,
    margin,
  };
}

export type StockStatus =
  | "SIN STOCK"
  | "CRÍTICO"
  | "BAJO"
  | "OK";

export function stockStatus(p: Product): StockStatus {
  if (p.stock <= 0) return "SIN STOCK";
  if (p.stock <= p.min) return "CRÍTICO";
  if (p.stock <= p.min * 2) return "BAJO";

  return "OK";
}

/** Texto de stock físico principal, ej. "49 bolsas 500 g". */
export function stockLabel(p: Product) {
  const n = (p.stock || 0).toLocaleString("es-CL", {
    maximumFractionDigits: 2,
  });

  const unit = p.stockUnitLabel;

  const plural =
    p.stock === 1
      ? unit
      : unit
          .replace(/^bolsa/, "bolsas")
          .replace(/^unidad/, "unidades")
          .replace(/^caja/, "cajas");

  return `${n} ${plural}`;
}

/** Equivalencia secundaria en kg, si aplica. */
export function stockKgLabel(p: Product) {
  if (!p.kgPerUnit) return null;

  const kg = p.stock * p.kgPerUnit;

  return `${kg.toLocaleString("es-CL", {
    maximumFractionDigits: 2,
  })} kg`;
}

export function customPriceKey(
  productId: string,
  formatLabel: string,
) {
  return `${productId}:${formatLabel}`;
}

/** Precio unitario según el tipo de precio del cliente. */
export function priceFor(
  p: Product,
  fmt: ProductFormat,
  customer: Customer | null,
): number {
  if (!customer) return fmt.price;

  if (customer.priceType === "PREFERENTE") {
    return fmt.prefPrice;
  }

  if (customer.priceType === "PERSONALIZADO") {
    const custom =
      customer.customPrices?.[
        customPriceKey(p.id, fmt.label)
      ];

    if (
      typeof custom === "number" &&
      custom > 0
    ) {
      return custom;
    }

    return fmt.prefPrice;
  }

  return fmt.price;
}

export function netCostForFormat(
  p: Product,
  fmt: ProductFormat,
) {
  return p.netCost * fmt.units;
}

export const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
  pendiente: "Pendiente",
};

export const priceTypeLabels: Record<string, string> = {
  LISTA: "Precio lista",
  PREFERENTE: "Precio preferente",
  PERSONALIZADO: "Precio personalizado",
};

export function whatsappText(sale: {
  customerName: string;
  lines: SaleLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  payment: string;
  note?: string;
  id?: string;
}) {
  const money = (n: number) =>
    "$" +
    Math.round(n).toLocaleString("es-CL");

  const qty = (n: number) =>
    n.toLocaleString("es-CL", {
      maximumFractionDigits: 2,
    });

  const fecha = new Date().toLocaleDateString(
    "es-CL",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );

  const detalle = sale.lines
    .map((l) => {
      return [
        `• ${l.name} (${l.format}) × ${qty(l.qty)}`,
        `  ${money(l.price)} c/u — *${money(
          l.price * l.qty,
        )}*`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "☕ *LICAN COFFEE*",
    "*COMPROBANTE DE COMPRA*",
    "",
    sale.id
      ? `*Venta:* ${sale.id}`
      : "",
    `*Fecha:* ${fecha}`,
    `*Cliente:* ${
      sale.customerName || "Sin cliente"
    }`,
    "",
    "*DETALLE DE LA COMPRA*",
    detalle,
    "",
    "─────────────",
    `Subtotal: ${money(sale.subtotal)}`,
    sale.discountAmount > 0
      ? `Descuento: -${money(
          sale.discountAmount,
        )}`
      : "",
    `*TOTAL: ${money(sale.total)}*`,
    "─────────────",
    "",
    `*Forma de pago:* ${
      paymentLabels[sale.payment] ??
      sale.payment
    }`,
    sale.note
      ? `*Observación:* ${sale.note}`
      : "",
    "",
    "✅ Compra registrada correctamente",
    "",
    "Gracias por preferir *Lican Coffee* ☕",
    "Café e insumos para cafeterías, negocios y emprendimientos.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function openWhatsapp(
  phone: string,
  text: string,
) {
  const digits = (phone || "").replace(
    /\D/g,
    "",
  );

  const to = digits
    ? digits.length === 9
      ? `56${digits}`
      : digits
    : "";

  const url = to
    ? `https://wa.me/${to}?text=${encodeURIComponent(
        text,
      )}`
    : `https://wa.me/?text=${encodeURIComponent(
        text,
      )}`;

  window.open(url, "_blank");
}

export function saleWhatsapp(sale: Sale) {
  openWhatsapp(
    sale.customerPhone,
    whatsappText(sale),
  );
}
