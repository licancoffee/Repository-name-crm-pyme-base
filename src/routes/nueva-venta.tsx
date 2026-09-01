
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Minus,
  Plus,
  Save,
  MessageCircle,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  customPriceKey,
  netCostForFormat,
  openWhatsapp,
  paymentLabels,
  priceTypeLabels,
  saleTotals,
  stockKgLabel,
  stockLabel,
  stockStatus,
  whatsappText,
} from "@/lib/crm/calc";
import { clp, pct, qtyFmt } from "@/lib/crm/format";
import { addCustomer, syncErp, useDB } from "@/lib/crm/store";
import { buildErpSalePayload } from "@/lib/crm/erp/payload";
import { registrarVentaErp } from "@/lib/crm/erp/sales.functions";
import {
  marcarCotizacionConvertida,
} from "@/lib/crm/cotizaciones/cotizaciones.functions";
import type {
  Customer,
  PaymentMethod,
  PriceType,
  Product,
  ProductFormat,
  Sale,
  SaleLine,
} from "@/lib/crm/types";

import { companyConfig } from "@/lib/config/company";
import { commercialConfig } from "@/lib/config/commercial";

export const Route = createFileRoute("/nueva-venta")({
  head: () => ({
    meta: [
      { title: `Nueva venta — ${companyConfig.name} CRM` },
      {
        name: "description",
        content:
          `Crear una venta de ${companyConfig.name}: cliente, productos, formatos, precios, control de stock y comprobante por WhatsApp.`,
      },
      { property: "og:title", content: `Nueva venta — ${companyConfig.name} CRM` },
      { property: "og:description", content: "Registra una venta en segundos." },
    ],
  }),
  component: NuevaVenta,
});

const payments: PaymentMethod[] = ["efectivo", "transferencia", "debito", "credito", "pendiente"];
const priceTypes: PriceType[] = ["LISTA", "PREFERENTE", "PERSONALIZADO"];

const lineKey = (productId: string, format: string) => `${productId}:${format}`;


type QuoteToSaleDraft = {
  version: 1;
  source: "cotizacion";
  quoteNumber?: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  priceType: PriceType;
  lines: SaleLine[];
  discountType: "monto" | "porcentaje";
  discountValue: number;
  payment: PaymentMethod;
  note?: string;
};

function NuevaVenta() {
  const db = useDB();
  const navigate = useNavigate();
  const quoteDraftApplied = useRef(false);

  const [sourceQuoteNumber, setSourceQuoteNumber] =
    useState("");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newC, setNewC] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
    priceType: commercialConfig.defaultPriceType as PriceType,
  });

  const [priceMode, setPriceMode] = useState<PriceType>(commercialConfig.defaultPriceType as PriceType);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [discountType, setDiscountType] = useState<"monto" | "porcentaje">("monto");
  const [discountValue, setDiscountValue] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewNote, setPreviewNote] = useState("");

  const totals = useMemo(
    () => saleTotals(lines, discountType, discountValue),
    [lines, discountType, discountValue],
  );

  const cartCount = lines.reduce((a, l) => a + l.qty, 0);

  const customerResults = db.customers.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(customerQuery.trim().toLowerCase()),
  );

  const productResults = db.products.filter((p) =>
    `${p.name} ${p.category}`.toLowerCase().includes(productQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    if (
      quoteDraftApplied.current ||
      db.products.length === 0
    ) {
      return;
    }

    const raw =
      sessionStorage.getItem(
        "crm:quote-to-sale",
      );

    if (!raw) {
      quoteDraftApplied.current = true;
      return;
    }

    try {
      const draft =
        JSON.parse(
          raw,
        ) as QuoteToSaleDraft;

      if (
        draft.version !== 1 ||
        draft.source !== "cotizacion"
      ) {
        throw new Error(
          "Formato de cotización no compatible.",
        );
      }

      const validatedLines =
        draft.lines
          .map((line) => {
            const product =
              db.products.find(
                (p) =>
                  p.id ===
                  line.productId,
              );

            if (!product) {
              return null;
            }

            const format =
              product.formats.find(
                (f) =>
                  f.label ===
                  line.format,
              );

            if (!format) {
              return null;
            }

            return {
              ...line,
              name: product.name,
              formatUnits:
                format.units,
              netCost:
                netCostForFormat(
                  product,
                  format,
                ),
            };
          })
          .filter(
            (
              line,
            ): line is SaleLine =>
              Boolean(line),
          );

      if (
        validatedLines.length !==
        draft.lines.length
      ) {
        toast.warning(
          "Algunos productos de la cotización cambiaron. Revisa la venta antes de guardarla.",
        );
      }

      let selectedCustomer:
        | Customer
        | null =
        null;

      if (draft.customerId) {
        selectedCustomer =
          db.customers.find(
            (c) =>
              c.id ===
              draft.customerId,
          ) || null;
      }

      if (
        !selectedCustomer &&
        draft.customerName
      ) {
        const normalizedName =
          draft.customerName
            .trim()
            .toLowerCase();

        const normalizedPhone =
          (
            draft.customerPhone ||
            ""
          ).replace(
            /\D/g,
            "",
          );

        selectedCustomer =
          db.customers.find(
            (c) => {
              const sameName =
                c.name
                  .trim()
                  .toLowerCase() ===
                normalizedName;

              const samePhone =
                !normalizedPhone ||
                c.phone.replace(
                  /\D/g,
                  "",
                ) ===
                  normalizedPhone;

              return (
                sameName &&
                samePhone
              );
            },
          ) || null;
      }

      if (
        !selectedCustomer &&
        draft.customerName.trim()
      ) {
        selectedCustomer =
          addCustomer({
            name:
              draft.customerName.trim(),
            phone:
              draft.customerPhone?.trim() ||
              "",
            address:
              draft.customerAddress?.trim() ||
              "",
            note:
              draft.quoteNumber
                ? `Creado desde cotización ${draft.quoteNumber}`
                : "Creado desde cotización",
            priceType:
              draft.priceType ||
              "LISTA",
          });
      }

      if (selectedCustomer) {
        setCustomer(
          selectedCustomer,
        );
        setCustomerQuery(
          selectedCustomer.name,
        );
      }

      setPriceMode(
        draft.priceType ||
          selectedCustomer?.priceType ||
          "LISTA",
      );

      setLines(
        validatedLines,
      );

      setDiscountType(
        draft.discountType,
      );

      setDiscountValue(
        Number(
          draft.discountValue,
        ) || 0,
      );

      setPayment(
        draft.payment,
      );

      setNote(
        draft.note || "",
      );

      setSourceQuoteNumber(
        draft.quoteNumber || "",
      );

      sessionStorage.removeItem(
        "crm:quote-to-sale",
      );

      toast.success(
        draft.quoteNumber
          ? `Cotización ${draft.quoteNumber} cargada. Revisa y confirma la venta.`
          : "Cotización cargada. Revisa y confirma la venta.",
      );
    } catch (error) {
      sessionStorage.removeItem(
        "crm:quote-to-sale",
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible cargar la cotización.",
      );
    } finally {
      quoteDraftApplied.current = true;
    }
  }, [
    db.products,
    db.customers,
  ]);

  /** Precio unitario según modo de precio activo y precios personalizados del cliente. */
  function resolvePrice(p: Product, fmt: ProductFormat, mode: PriceType = priceMode) {
    if (mode === "PREFERENTE") return fmt.prefPrice;
    if (mode === "PERSONALIZADO") {
      const custom = customer?.customPrices?.[customPriceKey(p.id, fmt.label)];
      if (typeof custom === "number" && custom > 0) return custom;
      return fmt.prefPrice;
    }
    return fmt.price;
  }

  function selectCustomer(c: Customer) {
    setCustomer(c);
    setPriceMode(c.priceType);
    applyPriceMode(c.priceType, c);
  }

  /** Recalcula los precios de todas las líneas según el modo elegido. */
  function applyPriceMode(mode: PriceType, forCustomer: Customer | null = customer) {
    setPriceMode(mode);
    setLines((prev) => {
      const repriced = prev.map((l) => {
        const p = db.products.find((x) => x.id === l.productId);
        const fmt = p?.formats.find((f) => f.label === l.format);
        if (!p || !fmt) return l;

        let price = fmt.price;

        if (mode === "PREFERENTE") {
          price = fmt.prefPrice;
        }

        if (mode === "PERSONALIZADO") {
          const custom =
            forCustomer?.customPrices?.[
              customPriceKey(p.id, fmt.label)
            ];
          price =
            typeof custom === "number" && custom > 0
              ? custom
              : fmt.prefPrice;
        }

        return { ...l, price };
      });

      return applyVolumePrice(repriced, mode);
    });
  }

  /** Unidades físicas de stock ya comprometidas para un producto. */
  function usedUnits(productId: string, exceptKey?: string) {
    return lines
      .filter((l) => l.productId === productId && lineKey(l.productId, l.format) !== exceptKey)
      .reduce((a, l) => a + l.qty * l.formatUnits, 0);
  }

  const stockOf = (id: string) => db.products.find((p) => p.id === id)?.stock ?? 0;

  /**
   * Aplica las reglas de precio por volumen configuradas para la empresa.
   * Si no existen reglas activas, conserva los precios calculados normalmente.
   */
  function applyVolumePrice(
    nextLines: SaleLine[],
    mode: PriceType = priceMode,
  ) {
    if (mode === "PERSONALIZADO") {
      return nextLines;
    }

    const activeRules =
      commercialConfig.volumePricingRules.filter(
        (rule) => rule.enabled,
      );

    if (activeRules.length === 0) {
      return nextLines;
    }

    let pricedLines = [...nextLines];

    for (const rule of activeRules) {
      const productNames = new Set(
        rule.productNames,
      );

      const combinedQuantity =
        pricedLines
          .filter((line) =>
            productNames.has(line.name),
          )
          .reduce(
            (total, line) =>
              total + line.qty,
            0,
          );

      const targetPrice =
        combinedQuantity >=
        rule.minimumCombinedQuantity
          ? rule.volumePrice
          : rule.normalPrice;

      pricedLines =
        pricedLines.map((line) =>
          productNames.has(line.name)
            ? {
                ...line,
                price: targetPrice,
              }
            : line,
        );
    }

    return pricedLines;
  }

  function addProduct(p: Product) {
    const fmt = p.formats[0];

    if (!fmt) {
      toast.error(`${p.name} no tiene formato de venta configurado`);
      return;
    }

    if (p.stock <= 0) {
      toast.error(`${p.name} sin stock disponible`);
      return;
    }

    const key = lineKey(p.id, fmt.label);
    const existing = lines.find(
      (l) => lineKey(l.productId, l.format) === key,
    );

    const needed = usedUnits(p.id) + fmt.units;

    if (needed > p.stock) {
      toast.error(`Stock insuficiente de ${p.name} (${stockLabel(p)})`);
      return;
    }

    setLines((prev) => {
      const nextLines = existing
        ? prev.map((l) =>
            lineKey(l.productId, l.format) === key
              ? { ...l, qty: l.qty + 1 }
              : l,
          )
        : [
            ...prev,
            {
              productId: p.id,
              name: p.name,
              format: fmt.label,
              formatUnits: fmt.units,
              price: resolvePrice(p, fmt),
              netCost: netCostForFormat(p, fmt),
              qty: 1,
            },
          ];

      return applyVolumePrice(nextLines);
    });

    toast.success(`${p.name} (${fmt.label}) agregado al carrito`);
  }

  function setQty(key: string, qty: number) {
    setLines((prev) => {
      const nextLines = prev.map((l) => {
        if (lineKey(l.productId, l.format) !== key) return l;

        const p = db.products.find((x) => x.id === l.productId);
        if (!p) return l;

        const otherUsedUnits = prev
          .filter(
            (x) =>
              x.productId === l.productId &&
              lineKey(x.productId, x.format) !== key,
          )
          .reduce(
            (total, x) => total + x.qty * x.formatUnits,
            0,
          );

        const maxQty = Math.max(
          0,
          Math.floor(
            (p.stock - otherUsedUnits) / l.formatUnits,
          ),
        );

        let nextQty = Math.max(0, qty);

        if (nextQty > maxQty) {
          toast.error(
            `Máximo ${qtyFmt(maxQty)} × ${l.format} de ${l.name}`,
          );
          nextQty = maxQty;
        }

        return { ...l, qty: nextQty };
      });

      return applyVolumePrice(
        nextLines.filter((l) => l.qty > 0),
      );
    });
  }

  function removeLine(key: string) {
    setLines((prev) =>
      applyVolumePrice(
        prev.filter(
          (l) => lineKey(l.productId, l.format) !== key,
        ),
      ),
    );
  }

  function changeFormat(key: string, fmt: ProductFormat) {
    setLines((prev) => {
      const line = prev.find(
        (l) => lineKey(l.productId, l.format) === key,
      );
      if (!line) return prev;

      const p = db.products.find((x) => x.id === line.productId);
      if (!p) return prev;

      const others = prev.filter(
        (l) => lineKey(l.productId, l.format) !== key,
      );

      const usedOthers = others
        .filter((l) => l.productId === p.id)
        .reduce((a, l) => a + l.qty * l.formatUnits, 0);

      const maxQty = Math.floor(
        (p.stock - usedOthers) / fmt.units,
      );

      const qty = Math.min(
        line.qty,
        Math.max(0, maxQty),
      );

      if (qty <= 0) {
        toast.error(
          `Stock insuficiente de ${p.name} para ${fmt.label}`,
        );
        return prev;
      }

      const targetKey = lineKey(p.id, fmt.label);
      const merged = others.find(
        (l) => lineKey(l.productId, l.format) === targetKey,
      );

      const updated: SaleLine = {
        ...line,
        format: fmt.label,
        formatUnits: fmt.units,
        price: resolvePrice(p, fmt),
        netCost: netCostForFormat(p, fmt),
        qty: merged ? merged.qty + qty : qty,
      };

      const nextLines = others
        .filter(
          (l) => lineKey(l.productId, l.format) !== targetKey,
        )
        .concat(updated);

      return applyVolumePrice(nextLines);
    });
  }

  function setLinePrice(key: string, price: number) {
    setLines((prev) =>
      prev.map((l) =>
        lineKey(l.productId, l.format) === key
          ? { ...l, price }
          : l,
      ),
    );
  }

  function createCustomer() {
    if (!newC.name.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }
    const created = addCustomer({
      name: newC.name.trim(),
      phone: newC.phone.trim(),
      address: newC.address.trim(),
      note: newC.note.trim(),
      priceType: newC.priceType,
    });
    selectCustomer(created);
    setShowNew(false);
    setNewC({
      name: "",
      phone: "",
      address: "",
      note: "",
      priceType: commercialConfig.defaultPriceType as PriceType,
    });
    toast.success("Cliente creado");
  }

  const saleDraft = {
    customerName: customer?.name ?? "Sin cliente",
    lines,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    total: totals.total,
    payment,
    note: previewNote || note,
  };

  function validate() {
    if (lines.length === 0) {
      toast.error("Agrega al menos un producto");
      return false;
    }
    if (lines.some((l) => l.qty <= 0)) {
      toast.error("Hay líneas con cantidad 0");
      return false;
    }
    for (const p of db.products) {
      const units = lines
        .filter((l) => l.productId === p.id)
        .reduce((a, l) => a + l.qty * l.formatUnits, 0);
      if (units > p.stock) {
        toast.error(`${p.name} supera el stock disponible (${stockLabel(p)})`);
        return false;
      }
    }
    return true;
  }

  async function handleSave() {
    if (saving || !validate()) return;

    setSaving(true);

    try {
      const now = new Date();

      const ventaId =
        `${commercialConfig.saleIdPrefix}-${now.getFullYear()}` +
        `${String(now.getMonth() + 1).padStart(2, "0")}` +
        `${String(now.getDate()).padStart(2, "0")}-` +
        `${now.getTime()}`;

      const sale: Sale = {
        id: ventaId,
        dateISO: now.toISOString(),

        customerId: customer?.id ?? null,
        customerName: customer?.name ?? "Sin cliente",
        customerPhone: customer?.phone ?? "",

        priceType: customer ? priceMode : null,

        lines,

        discountType,
        discountValue,
        discountAmount: totals.discountAmount,

        subtotal: totals.subtotal,
        total: totals.total,

        payment,
        note: sourceQuoteNumber
          ? [
              `Origen cotización ${sourceQuoteNumber}`,
              note,
            ]
              .filter(Boolean)
              .join(" · ")
          : note,

        status: "GUARDADA",
      };

      const payload = buildErpSalePayload(sale, customer);

      const result = await registrarVentaErp({ data: payload });

      if (!result.ok) {
        throw new Error(
          result.error ||
            "No fue posible conectar con el sistema. La venta no fue registrada.",
        );
      }

      let cotizacionMarcada = true;

      if (sourceQuoteNumber) {
        try {
          const conversion = await marcarCotizacionConvertida({
            data: {
              numero: sourceQuoteNumber,
              ventaId,
            },
          });

          if (!conversion.ok) {
            cotizacionMarcada = false;
            console.error(
              "Venta registrada, pero no se pudo marcar la cotización como convertida:",
              conversion,
            );
          }
        } catch (conversionError) {
          cotizacionMarcada = false;
          console.error(
            "Error al marcar cotización como convertida:",
            conversionError,
          );
        }
      }

      await syncErp();

      if (sourceQuoteNumber && !cotizacionMarcada) {
        toast.warning(
          `La venta ${ventaId} quedó registrada correctamente, pero no fue posible actualizar el estado de la cotización ${sourceQuoteNumber}.`,
        );
      } else {
        toast.success(
          result.duplicada
            ? "La venta ya estaba registrada. No se duplicó."
            : sourceQuoteNumber
              ? `Venta ${ventaId} registrada. Cotización ${sourceQuoteNumber} convertida en venta.`
              : `Venta ${ventaId} registrada correctamente`,
        );
      }

      navigate({ to: "/historial" });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No fue posible registrar la venta.";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function openPreview() {
    if (!validate()) return;
    setPreviewNote(note);
    setPreview(true);
  }

  function sendWhatsapp() {
    setNote(previewNote);
    openWhatsapp(customer?.phone ?? "", whatsappText({ ...saleDraft, note: previewNote }));
    setPreview(false);
  }

  return (
    <AppShell title="Nueva venta" subtitle={`Carrito: ${qtyFmt(cartCount)} productos`}>
      {/* Contador carrito */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="h-5 w-5 text-brand" />
          Carrito: {qtyFmt(cartCount)} productos
        </span>
        <span className="font-display text-lg font-bold">{clp(totals.total)}</span>
      </div>

      {sourceQuoteNumber && (
        <div className="mt-4 rounded-2xl border border-border bg-secondary/60 px-4 py-3">
          <p className="font-semibold">
            Venta desde cotización {sourceQuoteNumber}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cliente, productos, cantidades, precios, descuento y forma
            de pago fueron precargados. Revisa el stock y confirma con
            Guardar venta.
          </p>
        </div>
      )}

      {/* Cliente */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">1. Cliente</h2>
        {customer ? (
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-secondary p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{customer.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[customer.phone, customer.address].filter(Boolean).join(" · ") || "Sin datos"}
              </p>
              <Badge variant="outline" className="mt-1">
                {priceTypeLabels[customer.priceType]}
              </Badge>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setCustomer(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Buscar cliente existente..."
                className="h-12 pl-9"
              />
            </div>
            <div className="mt-2 space-y-1.5">
              {customerResults.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                >
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[c.phone, c.address].filter(Boolean).join(" · ") || "Sin datos"} ·{" "}
                    {priceTypeLabels[c.priceType]}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-3 h-12 w-full"
              onClick={() => setShowNew((v) => !v)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {showNew ? "Cancelar nuevo cliente" : "Crear cliente nuevo"}
            </Button>
            {showNew && (
              <div className="mt-3 space-y-3 rounded-xl bg-muted p-3">
                <div>
                  <Label htmlFor="nc-name">Nombre</Label>
                  <Input
                    id="nc-name"
                    className="mt-1 h-12"
                    value={newC.name}
                    onChange={(e) => setNewC({ ...newC, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="nc-phone">Teléfono</Label>
                  <Input
                    id="nc-phone"
                    inputMode="tel"
                    className="mt-1 h-12"
                    value={newC.phone}
                    onChange={(e) => setNewC({ ...newC, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="nc-address">Dirección / localidad</Label>
                  <Input
                    id="nc-address"
                    className="mt-1 h-12"
                    value={newC.address}
                    onChange={(e) => setNewC({ ...newC, address: e.target.value })}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Tipo de precio</p>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {priceTypes.map((t) => (
                      <Button
                        key={t}
                        variant={newC.priceType === t ? "default" : "outline"}
                        className="h-11 text-xs"
                        onClick={() => setNewC({ ...newC, priceType: t })}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="nc-note">Observación</Label>
                  <Textarea
                    id="nc-note"
                    className="mt-1"
                    value={newC.note}
                    onChange={(e) => setNewC({ ...newC, note: e.target.value })}
                  />
                </div>
                <Button className="h-12 w-full" onClick={createCustomer}>
                  Guardar cliente
                </Button>
              </div>
            )}
          </>
        )}

        <p className="mt-4 text-sm font-medium">Precios de esta venta</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {priceTypes.map((t) => (
            <Button
              key={t}
              variant={priceMode === t ? "default" : "outline"}
              className="h-11 text-xs"
              onClick={() => applyPriceMode(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </section>

      {/* Productos */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">2. Productos</h2>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Buscar producto del catálogo..."
            className="h-12 pl-9"
          />
        </div>
        <div className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
          {productResults.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.formats.map((f) => `${f.label} ${clp(resolvePrice(p, f))}`).join(" · ")}
                  </p>
                  <p className="text-xs font-medium">
                    Stock: {stockLabel(p)}
                    {stockKgLabel(p) && (
                      <span className="text-muted-foreground"> ({stockKgLabel(p)})</span>
                    )}
                  </p>
                </div>
                <Badge variant="outline">{stockStatus(p)}</Badge>
              </div>
              <Button
                className="mt-2 h-11 w-full"
                disabled={p.stock <= 0}
                onClick={() => addProduct(p)}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Agregar
              </Button>
            </div>
          ))}
          {productResults.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {lines.map((l) => {
            const key = lineKey(l.productId, l.format);
            const p = db.products.find((x) => x.id === l.productId);
            return (
              <div key={key} className="rounded-xl bg-secondary p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Formato {l.format} · descuenta {qtyFmt(l.formatUnits * l.qty)}{" "}
                      {p?.stockUnitLabel ?? "unidad"} · stock {qtyFmt(stockOf(l.productId))}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeLine(key)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {p && p.formats.length > 1 && (
                  <div className="mt-2 flex gap-2">
                    {p.formats.map((f) => (
                      <Button
                        key={f.label}
                        size="sm"
                        variant={l.format === f.label ? "default" : "outline"}
                        className="h-9 flex-1"
                        onClick={() => changeFormat(key, f)}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => setQty(key, Math.max(0, l.qty - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      inputMode="decimal"
                      value={String(l.qty)}
                      onChange={(e) => setQty(key, Number(e.target.value.replace(",", ".")) || 0)}
                      className="h-10 w-16 text-center"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => setQty(key, l.qty + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">P. unit.</span>
                    <Input
                      inputMode="numeric"
                      value={String(l.price)}
                      onChange={(e) =>
                        setLinePrice(key, Number(e.target.value.replace(/\D/g, "")) || 0)
                      }
                      className="h-10 w-24 text-right"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-xs text-muted-foreground">Subtotal línea</span>
                  <span className="font-display text-lg font-bold">{clp(l.price * l.qty)}</span>
                </div>
              </div>
            );
          })}
          {lines.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Aún no hay productos en la venta.
            </p>
          )}
        </div>
      </section>

      {/* Descuento y pago */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">3. Descuento y pago</h2>
        <div className="mt-3 flex gap-2">
          <Button
            variant={discountType === "monto" ? "default" : "outline"}
            className="h-11 flex-1"
            onClick={() => setDiscountType("monto")}
          >
            $ Pesos
          </Button>
          <Button
            variant={discountType === "porcentaje" ? "default" : "outline"}
            className="h-11 flex-1"
            onClick={() => setDiscountType("porcentaje")}
          >
            % Porcentaje
          </Button>
        </div>
        <Input
          inputMode="decimal"
          className="mt-2 h-12"
          value={discountValue ? String(discountValue) : ""}
          placeholder={discountType === "monto" ? "Descuento en $" : "Descuento en %"}
          onChange={(e) => setDiscountValue(Number(e.target.value.replace(",", ".")) || 0)}
        />

        <p className="mt-4 text-sm font-medium">Forma de pago</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {payments.map((p) => (
            <Button
              key={p}
              variant={payment === p ? "default" : "outline"}
              className="h-11"
              onClick={() => setPayment(p)}
            >
              {paymentLabels[p]}
            </Button>
          ))}
        </div>

        <div className="mt-4">
          <Label htmlFor="sale-note">Observación de la venta</Label>
          <Textarea
            id="sale-note"
            className="mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notas de entrega, acuerdos, etc."
          />
        </div>
      </section>

      {/* Resumen */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">4. Resumen</h2>
        <div className="mt-3 space-y-1 text-sm">
          <Row label="Subtotal" value={clp(totals.subtotal)} />
          <Row label="Descuento" value={`-${clp(totals.discountAmount)}`} />
          <Row label="Total a pagar" value={clp(totals.total)} bold />
          <div className="my-2 border-t border-border" />
          <Row label="Venta neta (sin IVA)" value={clp(totals.netSale)} />
          <Row label="Costo estimado" value={clp(totals.cost)} />
          <Row label="Utilidad neta estimada" value={clp(totals.profit)} />
          <Row label="Margen estimado" value={pct(totals.margin)} />
        </div>

        <Button className="mt-4 h-14 w-full text-base" disabled={saving} onClick={handleSave}>
          <Save className="mr-2 h-5 w-5" />
          {saving ? "Guardando..." : "Guardar venta"}
        </Button>
        <Button variant="outline" className="mt-2 h-14 w-full text-base" onClick={openPreview}>
          <MessageCircle className="mr-2 h-5 w-5" /> Vista previa comprobante
        </Button>
      </section>

      {/* Vista previa comprobante */}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista previa del comprobante</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">{saleDraft.customerName}</p>
            <div className="space-y-1 rounded-lg bg-muted p-3">
              {lines.map((l) => (
                <div key={lineKey(l.productId, l.format)} className="flex justify-between gap-2">
                  <span className="min-w-0">
                    {l.name} · {l.format} × {qtyFmt(l.qty)} · {clp(l.price)} c/u
                  </span>
                  <span className="shrink-0 font-medium">{clp(l.price * l.qty)}</span>
                </div>
              ))}
            </div>
            <Row label="Subtotal" value={clp(totals.subtotal)} />
            <Row label="Descuento" value={`-${clp(totals.discountAmount)}`} />
            <Row label="Total" value={clp(totals.total)} bold />
            <Row label="Forma de pago" value={paymentLabels[payment] ?? payment} />
            <div>
              <Label htmlFor="pv-note">Observaciones (editable)</Label>
              <Textarea
                id="pv-note"
                className="mt-1"
                value={previewNote}
                onChange={(e) => setPreviewNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-12" onClick={() => setPreview(false)}>
              Seguir editando
            </Button>
            <Button className="h-12" onClick={sendWhatsapp}>
              <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-display text-xl font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}


