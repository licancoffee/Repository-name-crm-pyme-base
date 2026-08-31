import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, MessageCircle, Ban } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  paymentLabels,
  saleTotals,
  saleWhatsapp,
} from "@/lib/crm/calc";

import {
  clp,
  dateFmt,
  pct,
  qtyFmt,
} from "@/lib/crm/format";

import {
  cancelSale,
  saleSource,
  syncErp,
  visibleSales,
  useDB,
} from "@/lib/crm/store";

import { anularVentaErp } from "@/lib/crm/erp/sales.functions";

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      {
        title:
          "Historial de ventas — Lican Coffee CRM",
      },
      {
        name: "description",
        content:
          "Ventas guardadas: detalle, total, forma de pago, comprobante y anulación.",
      },
      {
        property: "og:title",
        content: "Historial — Lican Coffee CRM",
      },
      {
        property: "og:description",
        content:
          "Ventas guardadas de Lican Coffee.",
      },
    ],
  }),

  component: Historial,
});

function Historial() {
  const db = useDB();

  const [open, setOpen] =
    useState<string | null>(null);

  const [cancellingId, setCancellingId] =
    useState<string | null>(null);

  const sales = visibleSales(db);

  async function handleCancel(
    saleId: string,
    source: "erp" | "local",
  ) {
    if (cancellingId) {
      return;
    }

    const confirmar = window.confirm(
      "¿Seguro que deseas anular esta venta?\n\n" +
        "Esta acción devolverá el stock y marcará la venta como ANULADA.",
    );

    if (!confirmar) {
      return;
    }

    setCancellingId(saleId);

    try {
      /**
       * Venta real del ERP
       */
      if (source === "erp") {
        const result = await anularVentaErp({
          data: {
            ventaId: saleId,
          },
        });

        if (!result.ok) {
          throw new Error(
            result.mensaje ||
              result.error ||
              "No fue posible anular la venta en el ERP.",
          );
        }

        /**
         * Volvemos a leer ERP para recuperar:
         * - nuevo stock
         * - estado ANULADA
         * - movimientos actualizados
         */
        await syncErp();

        toast.success(
          "Venta anulada en ERP y stock devuelto",
        );

        return;
      }

      /**
       * Compatibilidad con antiguas ventas locales.
       */
      cancelSale(saleId);

      toast.success(
        "Venta local anulada y stock devuelto",
      );
    } catch (error) {
      console.error(
        "[ANULAR VENTA] Error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible anular la venta.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <AppShell
      title="Historial"
      subtitle={`${sales.length} ventas`}
    >
      <div className="space-y-3">
        {sales.map((s) => {
          const t = saleTotals(
            s.lines,
            s.discountType,
            s.discountValue,
          );

          const isOpen = open === s.id;
          const source = saleSource(s);

          const isCancelled =
            s.status === "ANULADA";

          const isCancelling =
            cancellingId === s.id;

          return (
            <div
              key={s.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <button
                onClick={() =>
                  setOpen(
                    isOpen
                      ? null
                      : s.id,
                  )
                }
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {s.customerName}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {s.id} ·{" "}
                    {dateFmt(
                      s.dateISO,
                    )}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {
                        paymentLabels[
                          s.payment
                        ]
                      }
                    </Badge>

                    {s.priceType && (
                      <Badge variant="outline">
                        {
                          s.priceType
                        }
                      </Badge>
                    )}

                    <Badge variant="outline">
                      {source ===
                      "erp"
                        ? "ERP"
                        : "Local"}
                    </Badge>

                    {isCancelled && (
                      <Badge variant="destructive">
                        ANULADA
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-right">
                  <span className="font-display text-lg font-bold">
                    {clp(
                      s.total,
                    )}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="space-y-1.5 text-sm">
                    {s.lines.map(
                      (l) => (
                        <div
                          key={`${l.productId}:${l.format}`}
                          className="flex justify-between gap-3"
                        >
                          <span className="min-w-0 truncate">
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

                  <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                    <Row
                      label="Subtotal"
                      value={clp(
                        s.subtotal,
                      )}
                    />

                    {s.discountAmount >
                      0 && (
                      <Row
                        label="Descuento"
                        value={`-${clp(
                          s.discountAmount,
                        )}`}
                      />
                    )}

                    <Row
                      label="Total"
                      value={clp(
                        s.total,
                      )}
                      bold
                    />

                    <Row
                      label="Costo estimado"
                      value={clp(
                        t.cost,
                      )}
                    />

                    <Row
                      label="Utilidad neta est."
                      value={clp(
                        t.profit,
                      )}
                    />

                    <Row
                      label="Margen estimado"
                      value={pct(
                        t.margin,
                      )}
                    />
                  </div>

                  {s.note && (
                    <p className="mt-3 rounded-lg bg-muted p-2 text-sm italic">
                      {
                        s.note
                      }
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={() =>
                        saleWhatsapp(
                          s,
                        )
                      }
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />

                      Reenviar comprobante
                    </Button>

                    {!isCancelled && (
                      <Button
                        variant="destructive"
                        className="h-12"
                        disabled={
                          Boolean(
                            cancellingId,
                          )
                        }
                        onClick={() =>
                          handleCancel(
                            s.id,
                            source,
                          )
                        }
                      >
                        <Ban className="mr-2 h-4 w-4" />

                        {isCancelling
                          ? "Anulando venta..."
                          : "Anular venta"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sales.length ===
          0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay ventas guardadas.
          </p>
        )}
      </div>
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
    <div className="flex justify-between">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span
        className={
          bold
            ? "font-display text-base font-bold"
            : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
