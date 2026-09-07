import { companyConfig } from "@/lib/config/company";
import { clp, qtyFmt } from "@/lib/crm/format";

export type QuoteWhatsappItem = {
  producto: string;
  formato?: string;
  cantidad: number;
  precioUnitario: number;
};

export type QuoteWhatsappData = {
  numero: string;
  cliente: string;
  telefono?: string;
  total: number;
  pdfUrl?: string;
  formaPago?: string;
  observaciones?: string;
  items: QuoteWhatsappItem[];
};

function normalizeWhatsappPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9) return `56${digits}`;
  return digits;
}

export function quoteWhatsappText(data: QuoteWhatsappData) {
  const detail = data.items
    .map((item) => {
      const subtotal = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
      const format = item.formato ? ` (${item.formato})` : "";
      return `• ${item.producto}${format} × ${qtyFmt(item.cantidad)}\n  ${clp(item.precioUnitario)} c/u — *${clp(subtotal)}*`;
    })
    .join("\n\n");

  const lines: Array<string | null> = [
    `*${companyConfig.name.toUpperCase()}*`,
    "",
    "*COTIZACIÓN*",
    data.numero ? `N° ${data.numero}` : null,
    `Cliente: ${data.cliente || "Cliente"}`,
    "",
    "──────────────────",
    "*DETALLE*",
    "──────────────────",
    "",
    detail,
    "",
    "──────────────────",
    `*TOTAL: ${clp(data.total)}*`,
    "──────────────────",
    data.formaPago ? `Forma de pago: ${data.formaPago}` : null,
    data.observaciones ? `Observaciones: ${data.observaciones}` : null,
    data.pdfUrl ? `PDF: ${data.pdfUrl}` : null,
    "",
    "Esta cotización no reserva stock hasta confirmar la venta.",
    "",
    companyConfig.website || null,
    companyConfig.phone || null,
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

export function openQuoteWhatsapp(data: QuoteWhatsappData) {
  if (typeof window === "undefined") return;

  const phone = normalizeWhatsappPhone(data.telefono || "");
  const text = quoteWhatsappText(data);
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  const url = `${base}?text=${encodeURIComponent(text)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}
