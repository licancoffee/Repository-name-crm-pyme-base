import { createFileRoute, Link } from "@tanstack/react-router";

import { useState } from "react";

import {
  MapPin,
  Phone,
  Search,
  Settings2,
} from "lucide-react";

import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { clp, dateFmt } from "@/lib/crm/format";

import {
  customPriceKey,
  priceTypeLabels,
} from "@/lib/crm/calc";

import {
  setCustomerPrice,
  updateCustomer,
  useDB,
} from "@/lib/crm/store";

import type { PriceType } from "@/lib/crm/types";

import { companyConfig } from "@/lib/config/company";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      {
        title: `Clientes — ${companyConfig.name} CRM`,
      },
      {
        name: "description",
        content:
          `Gestión de clientes de ${companyConfig.name}, incluyendo tipo de precio, historial de compras, datos de contacto y precios personalizados.`,
      },
      {
        property: "og:title",
        content: `Clientes — ${companyConfig.name} CRM`,
      },
      {
        property: "og:description",
        content:
          `Fichas de clientes e historial de compras de ${companyConfig.name}.`,
      },
    ],
  }),

  component: Clientes,
});

const priceTypes: PriceType[] = [
  "LISTA",
  "PREFERENTE",
  "PERSONALIZADO",
];

function Clientes() {
  const db = useDB();

  const [q, setQ] = useState("");

  const [editing, setEditing] =
    useState<string | null>(null);

  const list = db.customers.filter((customer) =>
    `${customer.name} ${customer.phone} ${customer.address}`
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  );

  return (
    <AppShell
      title="Clientes"
      subtitle={`${db.customers.length} registrados`}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={q}
          onChange={(event) =>
            setQ(event.target.value)
          }
          placeholder="Buscar cliente..."
          className="h-12 pl-9"
        />
      </div>

      <Button
        asChild
        className="mt-3 h-12 w-full text-base"
      >
        <Link to="/nueva-venta">
          Nueva venta / nuevo cliente
        </Link>
      </Button>

      <div className="mt-4 space-y-3">
        {list.map((customer) => {
          const sales = db.sales.filter(
            (sale) =>
              sale.customerId === customer.id &&
              sale.status === "GUARDADA",
          );

          const total = sales.reduce(
            (sum, sale) =>
              sum + sale.total,
            0,
          );

          const last =
            sales[0];

          const isEditing =
            editing === customer.id;

          return (
            <div
              key={customer.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="font-display text-lg font-bold leading-tight">
                {customer.name}
              </p>

              {customer.phone && (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {customer.phone}
                </p>
              )}

              {customer.address && (
                <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {customer.address}
                </p>
              )}

              {customer.note && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {customer.note}
                </p>
              )}

              <Badge
                variant="outline"
                className="mt-2"
              >
                {
                  priceTypeLabels[
                    customer.priceType
                  ]
                }
              </Badge>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground">
                    Total compras
                  </p>

                  <p className="font-semibold">
                    {clp(total)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {sales.length} compras
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase text-muted-foreground">
                    Última compra
                  </p>

                  <p className="font-semibold">
                    {last
                      ? dateFmt(last.dateISO)
                      : "—"}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="mt-3 h-11 w-full"
                onClick={() =>
                  setEditing(
                    isEditing
                      ? null
                      : customer.id,
                  )
                }
              >
                <Settings2 className="mr-2 h-4 w-4" />

                {isEditing
                  ? "Cerrar"
                  : "Editar precios y datos"}
              </Button>

              {isEditing && (
                <div className="mt-3 space-y-3 rounded-xl bg-muted p-3">
                  <div>
                    <p className="text-sm font-medium">
                      Tipo de precio
                    </p>

                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {priceTypes.map(
                        (priceType) => (
                          <Button
                            key={priceType}
                            variant={
                              customer.priceType ===
                              priceType
                                ? "default"
                                : "outline"
                            }
                            className="h-11 text-xs"
                            onClick={() => {
                              updateCustomer(
                                customer.id,
                                {
                                  priceType,
                                },
                              );

                              toast.success(
                                `${customer.name}: ${priceTypeLabels[priceType]}`,
                              );
                            }}
                          >
                            {priceType}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Input
                      className="h-11"
                      placeholder="Teléfono"
                      defaultValue={
                        customer.phone
                      }
                      onBlur={(event) =>
                        updateCustomer(
                          customer.id,
                          {
                            phone:
                              event.target.value.trim(),
                          },
                        )
                      }
                    />

                    <Input
                      className="h-11"
                      placeholder="Dirección"
                      defaultValue={
                        customer.address
                      }
                      onBlur={(event) =>
                        updateCustomer(
                          customer.id,
                          {
                            address:
                              event.target.value.trim(),
                          },
                        )
                      }
                    />

                    <Input
                      className="h-11"
                      placeholder="Observación"
                      defaultValue={
                        customer.note
                      }
                      onBlur={(event) =>
                        updateCustomer(
                          customer.id,
                          {
                            note:
                              event.target.value.trim(),
                          },
                        )
                      }
                    />
                  </div>

                  {customer.priceType ===
                    "PERSONALIZADO" && (
                    <div>
                      <p className="text-sm font-medium">
                        Precios por producto y formato
                      </p>

                      <div className="mt-1 max-h-72 space-y-2 overflow-y-auto pr-1">
                        {db.products.flatMap(
                          (product) =>
                            product.formats.map(
                              (format) => {
                                const key =
                                  customPriceKey(
                                    product.id,
                                    format.label,
                                  );

                                return (
                                  <div
                                    key={
                                      key
                                    }
                                    className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm">
                                        {
                                          product.name
                                        }{" "}
                                        ·{" "}
                                        {
                                          format.label
                                        }
                                      </p>

                                      <p className="text-[11px] text-muted-foreground">
                                        Lista{" "}
                                        {clp(
                                          format.price,
                                        )}{" "}
                                        · Pref.{" "}
                                        {clp(
                                          format.prefPrice,
                                        )}
                                      </p>
                                    </div>

                                    <Input
                                      inputMode="numeric"
                                      className="h-10 text-right"
                                      placeholder={String(
                                        format.prefPrice,
                                      )}
                                      defaultValue={
                                        customer
                                          .customPrices?.[
                                          key
                                        ] ??
                                        ""
                                      }
                                      onBlur={(
                                        event,
                                      ) => {
                                        const value =
                                          Number(
                                            event.target.value.replace(
                                              /\D/g,
                                              "",
                                            ),
                                          ) ||
                                          0;

                                        setCustomerPrice(
                                          customer.id,
                                          key,
                                          value ||
                                            null,
                                        );
                                      }}
                                    />
                                  </div>
                                );
                              },
                            ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin resultados.
          </p>
        )}
      </div>
    </AppShell>
  );
}