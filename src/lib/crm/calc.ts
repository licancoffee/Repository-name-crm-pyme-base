import type {
  Customer,
  Product,
  ProductFormat,
  Sale,
  SaleLine,
} from "./types";

import { clientConfig } from "@/lib/config/client";

export const IVA = 1.19;

export function lineTotal(
  line: SaleLine,
) {
  return (
    line.price *
    line.qty
  );
}

/**
 * Unidades físicas de stock que consume una línea.
 */
export function lineStockUnits(
  line: SaleLine,
) {
  return (
    line.qty *
    (line.formatUnits || 1)
  );
}

export function saleTotals(
  lines: SaleLine[],
  discountType:
    | "monto"
    | "porcentaje",
  discountValue: number,
) {
  const subtotal =
    lines.reduce(
      (total, line) =>
        total +
        lineTotal(line),
      0,
    );

  const rawDiscount =
    discountType ===
    "porcentaje"
      ? (
          subtotal *
          (discountValue || 0)
        ) / 100
      : discountValue || 0;

  const discountAmount =
    Math.min(
      Math.max(
        rawDiscount,
        0,
      ),
      subtotal,
    );

  const total =
    subtotal -
    discountAmount;

  let netSale = 0;
  let cost = 0;

  for (const line of lines) {
    const share =
      subtotal > 0
        ? (
            lineTotal(
              line,
            ) /
            subtotal
          ) *
          discountAmount
        : 0;

    netSale +=
      (
        lineTotal(
          line,
        ) -
        share
      ) / IVA;

    cost +=
      line.netCost *
      line.qty;
  }

  const profit =
    netSale -
    cost;

  const margin =
    netSale > 0
      ? profit /
        netSale
      : 0;

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

export function stockStatus(
  product: Product,
): StockStatus {
  const stock =
    Number(product.stock || 0);

  const minimum =
    Math.max(
      Number(product.min || 0),
      0,
    );

  if (stock <= 0) {
    return "SIN STOCK";
  }

  // Cuando no existe un mínimo configurado, cualquier stock positivo está OK.
  if (minimum <= 0) {
    return "OK";
  }

  // Crítico: queda como máximo la mitad del stock mínimo definido.
  if (
    stock <=
    minimum * 0.5
  ) {
    return "CRÍTICO";
  }

  // Bajo: llegó al mínimo o está por debajo de él.
  if (stock <= minimum) {
    return "BAJO";
  }

  return "OK";
}

/**
 * Texto de stock físico principal.
 * Ejemplo: "49 bolsas 500 g".
 */
export function stockLabel(
  product: Product,
) {
  const value =
    (
      product.stock || 0
    ).toLocaleString(
      "es-CL",
      {
        maximumFractionDigits: 2,
      },
    );

  const unit =
    product.stockUnitLabel;

  const plural =
    product.stock === 1
      ? unit
      : unit
          .replace(
            /^bolsa/,
            "bolsas",
          )
          .replace(
            /^unidad/,
            "unidades",
          )
          .replace(
            /^caja/,
            "cajas",
          );

  return `${value} ${plural}`;
}

/**
 * Equivalencia secundaria en kg, si aplica.
 */
export function stockKgLabel(
  product: Product,
) {
  if (
    !product.kgPerUnit
  ) {
    return null;
  }

  const kg =
    product.stock *
    product.kgPerUnit;

  return `${kg.toLocaleString(
    "es-CL",
    {
      maximumFractionDigits: 2,
    },
  )} kg`;
}

export function customPriceKey(
  productId: string,
  formatLabel: string,
) {
  return `${productId}:${formatLabel}`;
}

/**
 * Precio unitario según el tipo de precio del cliente.
 */
export function priceFor(
  product: Product,
  format: ProductFormat,
  customer: Customer | null,
): number {
  if (!customer) {
    return format.price;
  }

  if (
    customer.priceType ===
    "PREFERENTE"
  ) {
    return format.prefPrice;
  }

  if (
    customer.priceType ===
    "PERSONALIZADO"
  ) {
    const custom =
      customer.customPrices?.[
        customPriceKey(
          product.id,
          format.label,
        )
      ];

    if (
      typeof custom ===
        "number" &&
      custom > 0
    ) {
      return custom;
    }

    return format.prefPrice;
  }

  return format.price;
}

export function netCostForFormat(
  product: Product,
  format: ProductFormat,
) {
  return (
    product.netCost *
    format.units
  );
}

export const paymentLabels: Record<
  string,
  string
> = {
  efectivo: "Efectivo",
  transferencia:
    "Transferencia",
  debito: "Débito",
  credito: "Crédito",
  pendiente: "Pendiente",
};

export const priceTypeLabels: Record<
  string,
  string
> = {
  LISTA: "Precio lista",
  PREFERENTE:
    "Precio preferente",
  PERSONALIZADO:
    "Precio personalizado",
};

export function whatsappText(
  sale: {
    customerName: string;
    lines: SaleLine[];
    subtotal: number;
    discountAmount: number;
    total: number;
    payment: string;
    note?: string;
    id?: string;
  },
) {
  const money = (
    value: number,
  ) =>
    "$" +
    Math.round(
      value,
    ).toLocaleString(
      "es-CL",
    );

  const qty = (
    value: number,
  ) =>
    value.toLocaleString(
      "es-CL",
      {
        maximumFractionDigits: 2,
      },
    );

  const fecha =
    new Date().toLocaleDateString(
      "es-CL",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );

  const detalle =
    sale.lines
      .map(
        (line) =>
          [
            `• ${line.name} (${line.format}) × ${qty(line.qty)}`,
            `  ${money(line.price)} c/u — *${money(
              line.price *
                line.qty,
            )}*`,
          ].join(
            "\n",
          ),
      )
      .join(
        "\n\n",
      );

  const company =
    clientConfig.company;

  const companyName =
    company.name.toUpperCase();

  return [
    `*${companyName}*`,
    "*COMPROBANTE DE COMPRA*",
    "",

    sale.id
      ? `*Venta:* ${sale.id}`
      : "",

    `*Fecha:* ${fecha}`,

    `*Cliente:* ${
      sale.customerName ||
      "Sin cliente"
    }`,

    "",
    "*DETALLE DE LA COMPRA*",
    detalle,
    "",
    "─────────────",

    `Subtotal: ${money(
      sale.subtotal,
    )}`,

    sale.discountAmount >
    0
      ? `Descuento: -${money(
          sale.discountAmount,
        )}`
      : "",

    `*TOTAL: ${money(
      sale.total,
    )}*`,

    "─────────────",
    "",

    `*Forma de pago:* ${
      paymentLabels[
        sale.payment
      ] ??
      sale.payment
    }`,

    sale.note
      ? `*Observación:* ${sale.note}`
      : "",

    "",
    "Compra registrada correctamente",
    "",

    `Gracias por preferir *${companyName}*.`,

    company.website
      ? `Web: ${company.website}`
      : "",

    company.phone
      ? `Tel: ${company.phone}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function openWhatsapp(
  phone: string,
  text: string,
) {
  const digits =
    (
      phone || ""
    ).replace(
      /\D/g,
      "",
    );

  const to =
    digits
      ? digits.length === 9
        ? `56${digits}`
        : digits
      : "";

  const url =
    to
      ? `https://wa.me/${to}?text=${encodeURIComponent(
          text,
        )}`
      : `https://wa.me/?text=${encodeURIComponent(
          text,
        )}`;

  window.open(
    url,
    "_blank",
  );
}

export function saleWhatsapp(
  sale: Sale,
) {
  openWhatsapp(
    sale.customerPhone,
    whatsappText(
      sale,
    ),
  );
}
