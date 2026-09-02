
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FileText,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  customPriceKey,
  netCostForFormat,
  paymentLabels,
  priceTypeLabels,
  saleTotals,
  stockKgLabel,
  stockLabel,
  stockStatus,
} from "@/lib/crm/calc";

import {
  clp,
  qtyFmt,
} from "@/lib/crm/format";

import {
  useDB,
} from "@/lib/crm/store";

import {
  crearCotizacion,
} from "@/lib/crm/cotizaciones/cotizaciones.functions";

import type {
  Customer,
  PaymentMethod,
  PriceType,
  Product,
  ProductFormat,
  SaleLine,
} from "@/lib/crm/types";

import { companyConfig } from "@/lib/config/company";
import { commercialConfig } from "@/lib/config/commercial";

export const Route = createFileRoute(
  "/nueva-cotizacion",
)({
  head: () => ({
    meta: [
      {
        title:
          `Nueva cotización — ${companyConfig.name} CRM`,
      },
      {
        name: "description",
        content:
          `Crear una cotización utilizando productos, precios y disponibilidad de ${companyConfig.name}.`,
      },
    ],
  }),

  component: NuevaCotizacion,
});

const payments: PaymentMethod[] = [
  "efectivo",
  "transferencia",
  "debito",
  "credito",
  "pendiente",
];

const priceTypes: PriceType[] = [
  "LISTA",
  "PREFERENTE",
  "PERSONALIZADO",
];

const lineKey = (
  productId: string,
  format: string,
) => `${productId}:${format}`;

function NuevaCotizacion() {
  const db = useDB();
  const navigate = useNavigate();

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [customerQuery, setCustomerQuery] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [businessName, setBusinessName] =
    useState("");

  const [priceMode, setPriceMode] =
    useState<PriceType>(commercialConfig.defaultPriceType as PriceType);

  const [lines, setLines] =
    useState<SaleLine[]>([]);

  const [productQuery, setProductQuery] =
    useState("");

  const [discountType, setDiscountType] =
    useState<"monto" | "porcentaje">("monto");

  const [discountValue, setDiscountValue] =
    useState(0);

  const [payment, setPayment] =
    useState<PaymentMethod>("pendiente");

  const [note, setNote] =
    useState("");

  const [preview, setPreview] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [createdQuote, setCreatedQuote] =
    useState<{
      numero?: string;
      estado?: string;
      pdfUrl?: string;
      documentoUrl?: string;
    } | null>(null);

  const totals = useMemo(
    () =>
      saleTotals(
        lines,
        discountType,
        discountValue,
      ),
    [
      lines,
      discountType,
      discountValue,
    ],
  );

  const cartCount = lines.reduce(
    (a, l) => a + l.qty,
    0,
  );

  const customerResults =
    db.customers.filter((c) =>
      `${c.name} ${c.phone}`
        .toLowerCase()
        .includes(
          customerQuery
            .trim()
            .toLowerCase(),
        ),
    );

  const productResults =
    db.products.filter((p) =>
      `${p.name} ${p.category}`
        .toLowerCase()
        .includes(
          productQuery
            .trim()
            .toLowerCase(),
        ),
    );

  function resolvePrice(
    p: Product,
    fmt: ProductFormat,
    mode: PriceType = priceMode,
  ) {
    if (mode === "PREFERENTE") {
      return fmt.prefPrice;
    }

    if (mode === "PERSONALIZADO") {
      const custom =
        customer?.customPrices?.[
          customPriceKey(
            p.id,
            fmt.label,
          )
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

  function selectCustomer(
    c: Customer,
  ) {
    setCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || "");

    setPriceMode(c.priceType);

    applyPriceMode(
      c.priceType,
      c,
    );
  }

  function clearCustomer() {
    setCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setBusinessName("");

    setPriceMode(commercialConfig.defaultPriceType as PriceType);

    applyPriceMode(
      commercialConfig.defaultPriceType as PriceType,
      null,
    );
  }

  function applyPriceMode(
    mode: PriceType,
    forCustomer:
      | Customer
      | null = customer,
  ) {
    setPriceMode(mode);

    setLines((prev) => {
      const repriced = prev.map(
        (l) => {
          const p =
            db.products.find(
              (x) =>
                x.id ===
                l.productId,
            );

          const fmt =
            p?.formats.find(
              (f) =>
                f.label ===
                l.format,
            );

          if (!p || !fmt) {
            return l;
          }

          let price = fmt.price;

          if (
            mode ===
            "PREFERENTE"
          ) {
            price =
              fmt.prefPrice;
          }

          if (
            mode ===
            "PERSONALIZADO"
          ) {
            const custom =
              forCustomer
                ?.customPrices?.[
                customPriceKey(
                  p.id,
                  fmt.label,
                )
              ];

            price =
              typeof custom ===
                "number" &&
              custom > 0
                ? custom
                : fmt.prefPrice;
          }

          return {
            ...l,
            price,
          };
        },
      );

      return applyVolumePrice(
        repriced,
        mode,
      );
    });
  }

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

  function usedUnits(
    productId: string,
    exceptKey?: string,
  ) {
    return lines
      .filter(
        (l) =>
          l.productId ===
            productId &&
          lineKey(
            l.productId,
            l.format,
          ) !== exceptKey,
      )
      .reduce(
        (a, l) =>
          a +
          l.qty *
            l.formatUnits,
        0,
      );
  }

  const stockOf = (
    id: string,
  ) =>
    db.products.find(
      (p) => p.id === id,
    )?.stock ?? 0;

  function addProduct(
    p: Product,
  ) {
    const fmt = p.formats[0];

    if (!fmt) {
      toast.error(
        `${p.name} no tiene formato de venta configurado`,
      );

      return;
    }

    if (p.stock <= 0) {
      toast.error(
        `${p.name} sin stock disponible`,
      );

      return;
    }

    const key = lineKey(
      p.id,
      fmt.label,
    );

    const existing =
      lines.find(
        (l) =>
          lineKey(
            l.productId,
            l.format,
          ) === key,
      );

    const needed =
      usedUnits(p.id) +
      fmt.units;

    if (
      needed > p.stock
    ) {
      toast.error(
        `Stock insuficiente de ${p.name} (${stockLabel(
          p,
        )})`,
      );

      return;
    }

    setLines((prev) => {
      const nextLines =
        existing
          ? prev.map((l) =>
              lineKey(
                l.productId,
                l.format,
              ) === key
                ? {
                    ...l,
                    qty:
                      l.qty + 1,
                  }
                : l,
            )
          : [
              ...prev,
              {
                productId:
                  p.id,
                name: p.name,
                format:
                  fmt.label,
                formatUnits:
                  fmt.units,
                price:
                  resolvePrice(
                    p,
                    fmt,
                  ),
                netCost:
                  netCostForFormat(
                    p,
                    fmt,
                  ),
                qty: 1,
              },
            ];

      return applyVolumePrice(
        nextLines,
      );
    });

    toast.success(
      `${p.name} agregado a la cotización`,
    );
  }

  function setQty(
    key: string,
    qty: number,
  ) {
    setLines((prev) => {
      const nextLines =
        prev.map((l) => {
          if (
            lineKey(
              l.productId,
              l.format,
            ) !== key
          ) {
            return l;
          }

          const p =
            db.products.find(
              (x) =>
                x.id ===
                l.productId,
            );

          if (!p) {
            return l;
          }

          const otherUsed =
            prev
              .filter(
                (x) =>
                  x.productId ===
                    l.productId &&
                  lineKey(
                    x.productId,
                    x.format,
                  ) !== key,
              )
              .reduce(
                (
                  total,
                  x,
                ) =>
                  total +
                  x.qty *
                    x.formatUnits,
                0,
              );

          const maxQty =
            Math.max(
              0,
              Math.floor(
                (p.stock -
                  otherUsed) /
                  l.formatUnits,
              ),
            );

          let nextQty =
            Math.max(
              0,
              qty,
            );

          if (
            nextQty > maxQty
          ) {
            toast.error(
              `Máximo ${qtyFmt(
                maxQty,
              )} × ${
                l.format
              } de ${l.name}`,
            );

            nextQty =
              maxQty;
          }

          return {
            ...l,
            qty: nextQty,
          };
        });

      return applyVolumePrice(
        nextLines.filter(
          (l) =>
            l.qty > 0,
        ),
      );
    });
  }

  function removeLine(
    key: string,
  ) {
    setLines((prev) =>
      applyVolumePrice(
        prev.filter(
          (l) =>
            lineKey(
              l.productId,
              l.format,
            ) !== key,
        ),
      ),
    );
  }

  function changeFormat(
    key: string,
    fmt: ProductFormat,
  ) {
    setLines((prev) => {
      const line =
        prev.find(
          (l) =>
            lineKey(
              l.productId,
              l.format,
            ) === key,
        );

      if (!line) {
        return prev;
      }

      const p =
        db.products.find(
          (x) =>
            x.id ===
            line.productId,
        );

      if (!p) {
        return prev;
      }

      const others =
        prev.filter(
          (l) =>
            lineKey(
              l.productId,
              l.format,
            ) !== key,
        );

      const usedOthers =
        others
          .filter(
            (l) =>
              l.productId ===
              p.id,
          )
          .reduce(
            (a, l) =>
              a +
              l.qty *
                l.formatUnits,
            0,
          );

      const maxQty =
        Math.floor(
          (p.stock -
            usedOthers) /
            fmt.units,
        );

      const qty =
        Math.min(
          line.qty,
          Math.max(
            0,
            maxQty,
          ),
        );

      if (qty <= 0) {
        toast.error(
          `Stock insuficiente de ${p.name} para ${fmt.label}`,
        );

        return prev;
      }

      const targetKey =
        lineKey(
          p.id,
          fmt.label,
        );

      const merged =
        others.find(
          (l) =>
            lineKey(
              l.productId,
              l.format,
            ) ===
            targetKey,
        );

      const updated: SaleLine =
        {
          ...line,
          format:
            fmt.label,
          formatUnits:
            fmt.units,
          price:
            resolvePrice(
              p,
              fmt,
            ),
          netCost:
            netCostForFormat(
              p,
              fmt,
            ),
          qty: merged
            ? merged.qty +
              qty
            : qty,
        };

      const nextLines =
        others
          .filter(
            (l) =>
              lineKey(
                l.productId,
                l.format,
              ) !==
              targetKey,
          )
          .concat(updated);

      return applyVolumePrice(
        nextLines,
      );
    });
  }

  function setLinePrice(
    key: string,
    price: number,
  ) {
    setLines((prev) =>
      prev.map((l) =>
        lineKey(
          l.productId,
          l.format,
        ) === key
          ? {
              ...l,
              price,
            }
          : l,
      ),
    );
  }

  function validate() {
    if (
      !customerName.trim()
    ) {
      toast.error(
        "Ingresa o selecciona un cliente",
      );

      return false;
    }

    if (
      !customerEmail.trim()
    ) {
      toast.error(
        "Ingresa el correo del cliente",
      );

      return false;
    }

    if (
      !customerEmail.includes(
        "@",
      )
    ) {
      toast.error(
        "Revisa el correo del cliente",
      );

      return false;
    }

    if (
      lines.length === 0
    ) {
      toast.error(
        "Agrega al menos un producto",
      );

      return false;
    }

    for (
      const p of db.products
    ) {
      const units =
        lines
          .filter(
            (l) =>
              l.productId ===
              p.id,
          )
          .reduce(
            (a, l) =>
              a +
              l.qty *
                l.formatUnits,
            0,
          );

      if (
        units > p.stock
      ) {
        toast.error(
          `${p.name} supera el stock disponible (${stockLabel(
            p,
          )})`,
        );

        return false;
      }
    }

    return true;
  }

  async function handleSendCotizacion() {
    if (sending || !validate()) {
      return;
    }

    setSending(true);

    try {
      const result = await crearCotizacion({
        data: {
          action: "crearCotizacion",
          cliente: {
            nombre: customerName.trim(),
            empresa: businessName.trim() || undefined,
            email: customerEmail.trim(),
            telefono: customerPhone.trim() || undefined,
            direccion: customer?.address?.trim() || undefined,
          },
          items: lines.map((line) => ({
            sku: line.productId,
            producto: line.name,
            formato: line.format,
            cantidad: line.qty,
            precioUnitario: line.price,
          })),
          descuento: totals.discountAmount,
          formaPago: paymentLabels[payment] ?? payment,
          observaciones: note.trim() || undefined,
        },
      });

      if (!result.ok) {
        throw new Error(
          result.mensaje ||
            result.error ||
            "No fue posible generar la cotización.",
        );
      }

      toast.success(
        result.estado === "ENVIADA"
          ? `Cotización ${result.numero ?? ""} enviada correctamente.`.trim()
          : result.mensaje ||
              `Cotización ${result.numero ?? ""} generada correctamente.`.trim(),
      );

      setCreatedQuote({
        numero: result.numero,
        estado: result.estado,
        pdfUrl: result.pdfUrl,
        documentoUrl: result.documentoUrl,
      });

      setPreview(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible enviar la cotización.";

      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  function convertToSale() {
    if (!createdQuote) {
      toast.error(
        "Primero debes generar la cotización.",
      );
      return;
    }

    const draft = {
      version: 1,
      source: "cotizacion",
      quoteNumber:
        createdQuote.numero || "",
      customerId:
        customer?.id || null,
      customerName:
        customerName.trim(),
      customerPhone:
        customerPhone.trim(),
      customerAddress:
        customer?.address || "",
      priceType: priceMode,
      lines,
      discountType,
      discountValue,
      payment,
      note: [
        createdQuote.numero
          ? `Cotización ${createdQuote.numero}`
          : "Cotización",
        note.trim(),
      ]
        .filter(Boolean)
        .join(" · "),
    };

    sessionStorage.setItem(
      "crm:quote-to-sale",
      JSON.stringify(draft),
    );

    navigate({
      to: "/nueva-venta",
    });
  }

  function openPreview() {
    if (createdQuote?.pdfUrl) {
      window.open(
        createdQuote.pdfUrl,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    if (!validate()) {
      return;
    }

    setPreview(true);
  }

  return (
    <AppShell
      title="Nueva cotización"
      subtitle={`Productos: ${qtyFmt(
        cartCount,
      )}`}
    >
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5 text-brand" />

          Cotización:{" "}
          {qtyFmt(
            cartCount,
          )}{" "}
          productos
        </span>

        <span className="font-display text-lg font-bold">
          {clp(
            totals.total,
          )}
        </span>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">
          1. Cliente
        </h2>

        {customer ? (
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-secondary p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {
                  customer.name
                }
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {customer.phone ||
                  "Sin teléfono"}
              </p>

              <Badge
                variant="outline"
                className="mt-1"
              >
                {
                  priceTypeLabels[
                    customer
                      .priceType
                  ]
                }
              </Badge>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={
                clearCustomer
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={
                  customerQuery
                }
                onChange={(e) =>
                  setCustomerQuery(
                    e.target
                      .value,
                  )
                }
                placeholder="Buscar cliente existente..."
                className="h-12 pl-9"
              />
            </div>

            <div className="mt-2 space-y-1.5">
              {customerResults
                .slice(0, 6)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      selectCustomer(
                        c,
                      )
                    }
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="block truncate font-medium">
                      {
                        c.name
                      }
                    </span>

                    <span className="block truncate text-xs text-muted-foreground">
                      {c.phone ||
                        "Sin teléfono"}{" "}
                      ·{" "}
                      {
                        priceTypeLabels[
                          c
                            .priceType
                        ]
                      }
                    </span>
                  </button>
                ))}
            </div>

            <div className="mt-4 space-y-3 rounded-xl bg-muted/40 p-3">
              <div>
                <Label htmlFor="quote-name">
                  Nombre del cliente
                </Label>

                <Input
                  id="quote-name"
                  className="mt-1 h-12"
                  value={
                    customerName
                  }
                  onChange={(e) =>
                    setCustomerName(
                      e.target
                        .value,
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="quote-phone">
                  Teléfono / WhatsApp
                </Label>

                <Input
                  id="quote-phone"
                  className="mt-1 h-12"
                  value={
                    customerPhone
                  }
                  onChange={(e) =>
                    setCustomerPhone(
                      e.target
                        .value,
                    )
                  }
                />
              </div>
            </div>
          </>
        )}

        <div className="mt-3">
          <Label htmlFor="quote-email">
            Correo electrónico
          </Label>

          <Input
            id="quote-email"
            type="email"
            className="mt-1 h-12"
            placeholder="cliente@correo.cl"
            value={
              customerEmail
            }
            onChange={(e) =>
              setCustomerEmail(
                e.target.value,
              )
            }
          />
        </div>

        <div className="mt-3">
          <Label htmlFor="quote-business">
            Empresa / negocio
          </Label>

          <Input
            id="quote-business"
            className="mt-1 h-12"
            placeholder="Opcional"
            value={
              businessName
            }
            onChange={(e) =>
              setBusinessName(
                e.target.value,
              )
            }
          />
        </div>

        <p className="mt-4 text-sm font-medium">
          Tipo de precio
        </p>

        <div className="mt-1 grid grid-cols-3 gap-2">
          {priceTypes.map(
            (t) => (
              <Button
                key={t}
                variant={
                  priceMode === t
                    ? "default"
                    : "outline"
                }
                className="h-11 text-xs"
                onClick={() =>
                  applyPriceMode(
                    t,
                  )
                }
              >
                {t}
              </Button>
            ),
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">
          2. Productos
        </h2>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={
              productQuery
            }
            onChange={(e) =>
              setProductQuery(
                e.target.value,
              )
            }
            placeholder="Buscar producto..."
            className="h-12 pl-9"
          />
        </div>

        <div className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
          {productResults.map(
            (p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border p-3"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {
                        p.name
                      }
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {p.formats
                        .map(
                          (
                            f,
                          ) =>
                            `${f.label} ${clp(
                              resolvePrice(
                                p,
                                f,
                              ),
                            )}`,
                        )
                        .join(
                          " · ",
                        )}
                    </p>

                    <p className="text-xs font-medium">
                      Disponible:{" "}
                      {stockLabel(
                        p,
                      )}

                      {stockKgLabel(
                        p,
                      ) && (
                        <span className="text-muted-foreground">
                          {" "}
                          (
                          {stockKgLabel(
                            p,
                          )}
                          )
                        </span>
                      )}
                    </p>
                  </div>

                  <Badge variant="outline">
                    {stockStatus(
                      p,
                    )}
                  </Badge>
                </div>

                <Button
                  className="mt-2 h-11 w-full"
                  disabled={
                    p.stock <= 0
                  }
                  onClick={() =>
                    addProduct(
                      p,
                    )
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" />

                  Agregar
                </Button>
              </div>
            ),
          )}
        </div>

        <div className="mt-4 space-y-2">
          {lines.map(
            (l) => {
              const key =
                lineKey(
                  l.productId,
                  l.format,
                );

              const p =
                db.products.find(
                  (x) =>
                    x.id ===
                    l.productId,
                );

              return (
                <div
                  key={key}
                  className="rounded-xl bg-secondary p-3"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {
                          l.name
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Formato{" "}
                        {
                          l.format
                        }{" "}
                        · disponibilidad{" "}
                        {qtyFmt(
                          stockOf(
                            l.productId,
                          ),
                        )}{" "}
                        {p?.stockUnitLabel ??
                          "unidad"}
                      </p>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        removeLine(
                          key,
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {p &&
                    p.formats
                      .length >
                      1 && (
                      <div className="mt-2 flex gap-2">
                        {p.formats.map(
                          (
                            f,
                          ) => (
                            <Button
                              key={
                                f.label
                              }
                              size="sm"
                              variant={
                                l.format ===
                                f.label
                                  ? "default"
                                  : "outline"
                              }
                              className="h-9 flex-1"
                              onClick={() =>
                                changeFormat(
                                  key,
                                  f,
                                )
                              }
                            >
                              {
                                f.label
                              }
                            </Button>
                          ),
                        )}
                      </div>
                    )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() =>
                          setQty(
                            key,
                            Math.max(
                              0,
                              l.qty -
                                1,
                            ),
                          )
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <Input
                        inputMode="decimal"
                        value={String(
                          l.qty,
                        )}
                        onChange={(e) =>
                          setQty(
                            key,
                            Number(
                              e.target.value.replace(
                                ",",
                                ".",
                              ),
                            ) ||
                              0,
                          )
                        }
                        className="h-10 w-16 text-center"
                      />

                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() =>
                          setQty(
                            key,
                            l.qty +
                              1,
                          )
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        P. unit.
                      </span>

                      <Input
                        inputMode="numeric"
                        value={String(
                          l.price,
                        )}
                        onChange={(e) =>
                          setLinePrice(
                            key,
                            Number(
                              e.target.value.replace(
                                /\D/g,
                                "",
                              ),
                            ) ||
                              0,
                          )
                        }
                        className="h-10 w-24 text-right"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="text-xs text-muted-foreground">
                      Subtotal
                    </span>

                    <span className="font-display text-lg font-bold">
                      {clp(
                        l.price *
                          l.qty,
                      )}
                    </span>
                  </div>
                </div>
              );
            },
          )}

          {lines.length ===
            0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Aún no hay productos
              en la cotización.
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">
          3. Condiciones
        </h2>

        <div className="mt-3 flex gap-2">
          <Button
            variant={
              discountType ===
              "monto"
                ? "default"
                : "outline"
            }
            className="h-11 flex-1"
            onClick={() =>
              setDiscountType(
                "monto",
              )
            }
          >
            $ Pesos
          </Button>

          <Button
            variant={
              discountType ===
              "porcentaje"
                ? "default"
                : "outline"
            }
            className="h-11 flex-1"
            onClick={() =>
              setDiscountType(
                "porcentaje",
              )
            }
          >
            % Porcentaje
          </Button>
        </div>

        <Input
          inputMode="decimal"
          className="mt-2 h-12"
          value={
            discountValue
              ? String(
                  discountValue,
                )
              : ""
          }
          placeholder={
            discountType ===
            "monto"
              ? "Descuento en $"
              : "Descuento en %"
          }
          onChange={(e) =>
            setDiscountValue(
              Number(
                e.target.value.replace(
                  ",",
                  ".",
                ),
              ) || 0,
            )
          }
        />

        <p className="mt-4 text-sm font-medium">
          Forma de pago propuesta
        </p>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {payments.map(
            (p) => (
              <Button
                key={p}
                variant={
                  payment === p
                    ? "default"
                    : "outline"
                }
                className="h-11"
                onClick={() =>
                  setPayment(
                    p,
                  )
                }
              >
                {
                  paymentLabels[
                    p
                  ]
                }
              </Button>
            ),
          )}
        </div>

        <div className="mt-4">
          <Label htmlFor="quote-note">
            Observaciones
          </Label>

          <Textarea
            id="quote-note"
            className="mt-1"
            value={note}
            onChange={(e) =>
              setNote(
                e.target.value,
              )
            }
            placeholder="Despacho, vigencia, condiciones especiales, etc."
          />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">
          4. Resumen
        </h2>

        <div className="mt-3 space-y-1 text-sm">
          <Row
            label="Subtotal"
            value={clp(
              totals.subtotal,
            )}
          />

          <Row
            label="Descuento"
            value={`-${clp(
              totals.discountAmount,
            )}`}
          />

          <Row
            label="Total cotización"
            value={clp(
              totals.total,
            )}
            bold
          />
        </div>

        <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          Crear esta cotización
          no descuenta stock.
          El inventario solo se
          modificará cuando una
          cotización sea
          convertida en venta.
        </div>

        {createdQuote && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/60 p-3">
            <p className="font-semibold">
              Cotización{" "}
              {createdQuote.numero ||
                "generada"}{" "}
              lista para convertir
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Al convertirla se abrirá Nueva venta con cliente,
              productos, cantidades, precios, descuento y forma de
              pago precargados. El stock se descontará solo cuando
              confirmes Guardar venta.
            </p>

            <Button
              className="mt-3 h-12 w-full"
              onClick={convertToSale}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Convertir en venta
            </Button>
          </div>
        )}

        <Button
          className="mt-4 h-14 w-full text-base"
          onClick={
            openPreview
          }
        >
          <FileText className="mr-2 h-5 w-5" />
          {createdQuote?.pdfUrl
            ? "Ver cotización PDF"
            : "Vista previa de cotización"}
        </Button>
      </section>

      <Dialog
        open={preview}
        onOpenChange={
          setPreview
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Vista previa de
              cotización
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">
                {
                  customerName
                }
              </p>

              {businessName && (
                <p className="text-muted-foreground">
                  {
                    businessName
                  }
                </p>
              )}

              <p className="text-muted-foreground">
                {
                  customerEmail
                }
              </p>

              {customerPhone && (
                <p className="text-muted-foreground">
                  {
                    customerPhone
                  }
                </p>
              )}
            </div>

            <div className="space-y-1 rounded-lg bg-muted p-3">
              {lines.map(
                (l) => (
                  <div
                    key={lineKey(
                      l.productId,
                      l.format,
                    )}
                    className="flex justify-between gap-2"
                  >
                    <span className="min-w-0">
                      {
                        l.name
                      }{" "}
                      ·{" "}
                      {
                        l.format
                      }{" "}
                      ×{" "}
                      {qtyFmt(
                        l.qty,
                      )}{" "}
                      ·{" "}
                      {clp(
                        l.price,
                      )}{" "}
                      c/u
                    </span>

                    <span className="shrink-0 font-medium">
                      {clp(
                        l.price *
                          l.qty,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>

            <Row
              label="Subtotal"
              value={clp(
                totals.subtotal,
              )}
            />

            <Row
              label="Descuento"
              value={`-${clp(
                totals.discountAmount,
              )}`}
            />

            <Row
              label="Total"
              value={clp(
                totals.total,
              )}
              bold
            />

            <Row
              label="Forma de pago"
              value={
                paymentLabels[
                  payment
                ] ??
                payment
              }
            />

            {note && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-medium">
                  Observaciones
                </p>

                <p className="mt-1">
                  {note}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Al enviar, se generará el PDF con el formato de{" "}
              {companyConfig.name}, se guardará en Drive y se enviará
              automáticamente al correo del cliente. La cotización no
              descuenta stock.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-12"
              onClick={() =>
                setPreview(false)
              }
            >
              Seguir editando
            </Button>

            <Button
              className="h-12"
              onClick={handleSendCotizacion}
              disabled={sending}
            >
              <FileText className="mr-2 h-4 w-4" />
              {sending
                ? "Enviando cotización..."
                : "Enviar cotización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span
        className={
          bold
            ? "font-display text-xl font-bold"
            : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

