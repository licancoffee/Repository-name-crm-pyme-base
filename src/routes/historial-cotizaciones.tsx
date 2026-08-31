import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { clp, qtyFmt } from "@/lib/crm/format";
import { netCostForFormat } from "@/lib/crm/calc";
import { useDB } from "@/lib/crm/store";

import {
  listarCotizaciones,
} from "@/lib/crm/cotizaciones/cotizaciones.functions";

import type {
  CotizacionHistorial,
} from "@/lib/crm/cotizaciones/appsScript.server";

import type {
  Customer,
  PaymentMethod,
  PriceType,
  SaleLine,
} from "@/lib/crm/types";


export const Route = createFileRoute(
  "/historial-cotizaciones",
)({
  head: () => ({
    meta: [
      {
        title:
          "Historial de cotizaciones — Lican Coffee CRM",
      },
      {
        name: "description",
        content:
          "Consulta, revisa y convierte cotizaciones de Lican Coffee en ventas.",
      },
    ],
  }),

  component: HistorialCotizaciones,
});


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


function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function normalizePhone(value: unknown) {
  return String(value ?? "")
    .replace(/\D/g, "");
}


function paymentFromQuote(
  value: unknown,
): PaymentMethod {
  const normalized =
    normalizeText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized.includes("transfer")
  ) {
    return "transferencia";
  }

  if (
    normalized.includes("debito")
  ) {
    return "debito";
  }

  if (
    normalized.includes("credito")
  ) {
    return "credito";
  }

  if (
    normalized.includes("efectivo")
  ) {
    return "efectivo";
  }

  return "pendiente";
}


function quoteStatusVariant(
  estado: string,
): "default" | "secondary" | "outline" | "destructive" {
  const normalized =
    normalizeText(estado);

  if (
    normalized === "convertida"
  ) {
    return "secondary";
  }

  if (
    normalized.includes("error")
  ) {
    return "destructive";
  }

  if (
    normalized === "enviada"
  ) {
    return "default";
  }

  return "outline";
}


function quoteDateLabel(
  value: unknown,
) {
  if (!value) return "Sin fecha";

  const raw =
    String(value);

  const parsed =
    new Date(raw);

  if (
    !Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return parsed.toLocaleString(
      "es-CL",
      {
        dateStyle: "short",
        timeStyle: "short",
      },
    );
  }

  return raw;
}


function HistorialCotizaciones() {
  const db = useDB();
  const navigate = useNavigate();

  const [cotizaciones, setCotizaciones] =
    useState<CotizacionHistorial[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [query, setQuery] =
    useState("");

  const [selected, setSelected] =
    useState<CotizacionHistorial | null>(
      null,
    );

  const [converting, setConverting] =
    useState(false);


  async function loadQuotes() {
    setLoading(true);

    try {
      const result =
        await listarCotizaciones({
          data: {},
        });

      if (!result.ok) {
        throw new Error(
          result.mensaje ||
            result.error ||
            "No fue posible cargar las cotizaciones.",
        );
      }

      const rows =
        Array.isArray(
          result.cotizaciones,
        )
          ? result.cotizaciones
          : [];

      const sorted =
        [...rows].sort(
          (a, b) => {
            const aNumber =
              String(
                a.numero || "",
              );

            const bNumber =
              String(
                b.numero || "",
              );

            return bNumber.localeCompare(
              aNumber,
              "es",
              {
                numeric: true,
              },
            );
          },
        );

      setCotizaciones(
        sorted,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible cargar las cotizaciones.",
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void loadQuotes();
  }, []);


  const filtered =
    useMemo(
      () => {
        const q =
          normalizeText(
            query,
          );

        if (!q) {
          return cotizaciones;
        }

        return cotizaciones.filter(
          (cot) =>
            [
              cot.numero,
              cot.cliente,
              cot.empresa,
              cot.email,
              cot.telefono,
              cot.producto,
              cot.estado,
            ]
              .map(
                normalizeText,
              )
              .some(
                (value) =>
                  value.includes(
                    q,
                  ),
              ),
        );
      },
      [
        cotizaciones,
        query,
      ],
    );


  function findCustomer(
    cot: CotizacionHistorial,
  ): Customer | null {
    const name =
      normalizeText(
        cot.cliente,
      );

    const phone =
      normalizePhone(
        cot.telefono,
      );

    if (!name) {
      return null;
    }

    return (
      db.customers.find(
        (customer) => {
          const sameName =
            normalizeText(
              customer.name,
            ) === name;

          if (!sameName) {
            return false;
          }

          if (!phone) {
            return true;
          }

          return (
            normalizePhone(
              customer.phone,
            ) === phone
          );
        },
      ) || null
    );
  }


  function buildSaleLines(
    cot: CotizacionHistorial,
  ): SaleLine[] {
    const items =
      Array.isArray(cot.items)
        ? cot.items
        : [];

    if (!items.length) {
      throw new Error(
        "Esta cotización es anterior al sistema de conversión automática y no contiene el detalle estructurado de productos.",
      );
    }

    return items.map(
      (item) => {
        const product =
          db.products.find(
            (p) =>
              p.id === item.sku,
          );

        if (!product) {
          throw new Error(
            `El producto "${item.producto}" ya no está disponible en el catálogo del CRM.`,
          );
        }

        const format =
          product.formats.find(
            (f) =>
              f.label ===
              item.formato,
          );

        if (!format) {
          throw new Error(
            `El formato "${item.formato}" de ${item.producto} ya no está disponible en el CRM.`,
          );
        }

        return {
          productId:
            product.id,
          name:
            product.name,
          format:
            format.label,
          formatUnits:
            format.units,

          /*
           * Se conserva el precio
           * exacto de la cotización.
           * No se reemplaza por el
           * precio actual del catálogo.
           */
          price:
            Number(
              item.precioUnitario,
            ) || 0,

          netCost:
            netCostForFormat(
              product,
              format,
            ),

          qty:
            Number(
              item.cantidad,
            ) || 0,
        };
      },
    );
  }


  function canConvert(
    cot: CotizacionHistorial,
  ) {
    const converted =
      normalizeText(
        cot.estado,
      ) === "convertida";

    const hasItems =
      Array.isArray(
        cot.items,
      ) &&
      cot.items.length > 0;

    return (
      !converted &&
      hasItems
    );
  }


  function convertToSale(
    cot: CotizacionHistorial,
  ) {
    if (
      normalizeText(
        cot.estado,
      ) === "convertida"
    ) {
      toast.info(
        `La cotización ${cot.numero} ya fue convertida en venta.`,
      );

      return;
    }

    setConverting(true);

    try {
      const lines =
        buildSaleLines(
          cot,
        );

      if (!lines.length) {
        throw new Error(
          "La cotización no contiene productos convertibles.",
        );
      }

      if (
        lines.some(
          (line) =>
            line.qty <= 0 ||
            line.price <= 0,
        )
      ) {
        throw new Error(
          "La cotización contiene una cantidad o precio inválido.",
        );
      }

      const customer =
        findCustomer(
          cot,
        );

      const priceType:
        PriceType =
        customer?.priceType ||
        "LISTA";

      const draft:
        QuoteToSaleDraft = {
        version: 1,
        source:
          "cotizacion",

        quoteNumber:
          cot.numero,

        customerId:
          customer?.id ||
          null,

        customerName:
          String(
            cot.cliente ||
            "",
          ).trim(),

        customerPhone:
          String(
            cot.telefono ||
            "",
          ).trim(),

        customerAddress:
          String(
            cot.direccion ||
            cot.localidad ||
            "",
          ).trim(),

        priceType,

        lines,

        /*
         * El backend guarda el
         * descuento total en pesos.
         * Por eso se recupera como
         * descuento tipo "monto".
         */
        discountType:
          "monto",

        discountValue:
          Number(
            cot.descuento ||
            0,
          ),

        payment:
          paymentFromQuote(
            cot.formaPago,
          ),

        note:
          [
            `Cotización ${cot.numero}`,
            cot.observaciones,
          ]
            .filter(Boolean)
            .join(" · "),
      };

      sessionStorage.setItem(
        "lican:quote-to-sale",
        JSON.stringify(
          draft,
        ),
      );

      setSelected(
        null,
      );

      navigate({
        to: "/nueva-venta",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No fue posible convertir la cotización en venta.",
      );
    } finally {
      setConverting(false);
    }
  }


  function openUrl(
    url?: string,
  ) {
    const value =
      String(
        url || "",
      ).trim();

    if (!value) {
      toast.error(
        "Esta cotización no tiene un enlace disponible.",
      );

      return;
    }

    window.open(
      value,
      "_blank",
      "noopener,noreferrer",
    );
  }


  return (
    <AppShell
      title="Historial de cotizaciones"
      subtitle={`${filtered.length} cotizaciones`}
    >
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value,
                )
              }
              placeholder="Buscar por número, cliente, empresa o producto..."
              className="h-12 pl-9"
            />
          </div>

          <Button
            variant="outline"
            className="h-12"
            disabled={loading}
            onClick={() =>
              void loadQuotes()
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Actualizar
          </Button>
        </div>
      </section>


      <section className="mt-4 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Cargando cotizaciones...
          </div>
        )}


        {!loading &&
          filtered.map(
            (cot) => (
              <div
                key={
                  cot.numero
                }
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-bold">
                        {cot.numero}
                      </p>

                      <Badge
                        variant={quoteStatusVariant(
                          cot.estado,
                        )}
                      >
                        {cot.estado ||
                          "SIN ESTADO"}
                      </Badge>
                    </div>

                    <p className="mt-1 font-semibold">
                      {cot.cliente ||
                        "Sin cliente"}
                    </p>

                    {cot.empresa && (
                      <p className="text-sm text-muted-foreground">
                        {cot.empresa}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-muted-foreground">
                      {quoteDateLabel(
                        cot.fecha,
                      )}
                    </p>

                    {cot.producto && (
                      <p className="mt-2 text-sm">
                        {cot.producto}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">
                      Total
                    </p>

                    <p className="font-display text-xl font-bold">
                      {clp(
                        Number(
                          cot.total ||
                          0,
                        ),
                      )}
                    </p>
                  </div>
                </div>


                {normalizeText(
                  cot.estado,
                ) ===
                  "convertida" && (
                  <div className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm">
                    <p className="font-medium">
                      Convertida en venta
                    </p>

                    {cot.ventaId && (
                      <p className="text-xs text-muted-foreground">
                        Venta:{" "}
                        {cot.ventaId}
                      </p>
                    )}
                  </div>
                )}


                {!Array.isArray(
                  cot.items,
                ) ||
                cot.items.length ===
                  0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                    Cotización anterior a la conversión automática. Se puede consultar, pero la venta debe crearse manualmente.
                  </div>
                ) : null}


                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() =>
                      setSelected(
                        cot,
                      )
                    }
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={
                      !cot.pdfUrl
                    }
                    onClick={() =>
                      openUrl(
                        cot.pdfUrl,
                      )
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>

                  <Button
                    className="col-span-2 h-11 sm:col-auto"
                    disabled={
                      !canConvert(
                        cot,
                      ) ||
                      converting
                    }
                    onClick={() =>
                      convertToSale(
                        cot,
                      )
                    }
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />

                    {normalizeText(
                      cot.estado,
                    ) ===
                    "convertida"
                      ? "Ya convertida"
                      : "Convertir en venta"}
                  </Button>
                </div>
              </div>
            ),
          )}


        {!loading &&
          filtered.length ===
            0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />

              <p className="mt-3 font-semibold">
                No se encontraron cotizaciones
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Prueba con otro número, cliente o producto.
              </p>
            </div>
          )}
      </section>


      <Dialog
        open={Boolean(
          selected,
        )}
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            setSelected(
              null,
            );
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Cotización{" "}
                  {selected.numero}
                </DialogTitle>
              </DialogHeader>


              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={quoteStatusVariant(
                      selected.estado,
                    )}
                  >
                    {selected.estado ||
                      "SIN ESTADO"}
                  </Badge>

                  <span className="text-muted-foreground">
                    {quoteDateLabel(
                      selected.fecha,
                    )}
                  </span>
                </div>


                <div className="rounded-xl bg-secondary p-3">
                  <p className="font-semibold">
                    {selected.cliente ||
                      "Sin cliente"}
                  </p>

                  {selected.empresa && (
                    <p className="text-muted-foreground">
                      {selected.empresa}
                    </p>
                  )}

                  {selected.email && (
                    <p className="text-muted-foreground">
                      {selected.email}
                    </p>
                  )}

                  {selected.telefono && (
                    <p className="text-muted-foreground">
                      {selected.telefono}
                    </p>
                  )}

                  {(selected.direccion ||
                    selected.localidad) && (
                    <p className="text-muted-foreground">
                      {[
                        selected.direccion,
                        selected.localidad,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          " · ",
                        )}
                    </p>
                  )}
                </div>


                {Array.isArray(
                  selected.items,
                ) &&
                selected.items.length >
                  0 ? (
                  <div className="space-y-2">
                    <p className="font-semibold">
                      Productos
                    </p>

                    {selected.items.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={`${item.sku}-${item.formato}-${index}`}
                          className="rounded-xl border border-border p-3"
                        >
                          <div className="flex justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">
                                {item.producto}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {item.formato ||
                                  "Sin formato"}
                                {" · "}
                                {qtyFmt(
                                  Number(
                                    item.cantidad ||
                                    0,
                                  ),
                                )}
                                {" × "}
                                {clp(
                                  Number(
                                    item.precioUnitario ||
                                    0,
                                  ),
                                )}
                              </p>
                            </div>

                            <p className="shrink-0 font-semibold">
                              {clp(
                                Number(
                                  item.precioUnitario ||
                                  0,
                                ) *
                                  Number(
                                    item.cantidad ||
                                    0,
                                  ),
                              )}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-3 text-muted-foreground">
                    Esta cotización pertenece al registro anterior y no tiene líneas estructuradas para conversión automática.
                  </div>
                )}


                <div className="space-y-1 rounded-xl border border-border p-3">
                  <DetailRow
                    label="Neto"
                    value={clp(
                      Number(
                        selected.neto ||
                        0,
                      ),
                    )}
                  />

                  <DetailRow
                    label="IVA"
                    value={clp(
                      Number(
                        selected.iva ||
                        0,
                      ),
                    )}
                  />

                  {Number(
                    selected.descuento ||
                    0,
                  ) > 0 && (
                    <DetailRow
                      label="Descuento"
                      value={`-${clp(
                        Number(
                          selected.descuento ||
                          0,
                        ),
                      )}`}
                    />
                  )}

                  <DetailRow
                    label="Total"
                    value={clp(
                      Number(
                        selected.total ||
                        0,
                      ),
                    )}
                    bold
                  />
                </div>


                {selected.formaPago && (
                  <DetailRow
                    label="Forma de pago"
                    value={
                      selected.formaPago
                    }
                  />
                )}


                {selected.observaciones && (
                  <div>
                    <p className="font-semibold">
                      Observaciones
                    </p>

                    <p className="mt-1 text-muted-foreground">
                      {selected.observaciones}
                    </p>
                  </div>
                )}


                {normalizeText(
                  selected.estado,
                ) ===
                  "convertida" && (
                  <div className="rounded-xl bg-secondary p-3">
                    <p className="font-semibold">
                      Cotización convertida
                    </p>

                    {selected.ventaId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Venta:{" "}
                        {selected.ventaId}
                      </p>
                    )}

                    {selected.fechaConversion && (
                      <p className="text-xs text-muted-foreground">
                        Fecha:{" "}
                        {quoteDateLabel(
                          selected.fechaConversion,
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>


              <DialogFooter className="gap-2 sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {selected.pdfUrl && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        openUrl(
                          selected.pdfUrl,
                        )
                      }
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  )}

                  {(selected.documentoUrl ||
                    selected.docUrl) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        openUrl(
                          selected.documentoUrl ||
                            selected.docUrl,
                        )
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Documento
                    </Button>
                  )}
                </div>


                <Button
                  disabled={
                    !canConvert(
                      selected,
                    ) ||
                    converting
                  }
                  onClick={() =>
                    convertToSale(
                      selected,
                    )
                  }
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />

                  {normalizeText(
                    selected.estado,
                  ) ===
                  "convertida"
                    ? "Ya convertida"
                    : "Convertir en venta"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}


function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span
        className={
          bold
            ? "font-display text-lg font-bold"
            : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
