import { createFileRoute } from "@tanstack/react-router";

import { useMemo, useState } from "react";

import { Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";

import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import {
  stockKgLabel,
  stockLabel,
  stockStatus,
  type StockStatus,
} from "@/lib/crm/calc";

import { clp, qtyFmt } from "@/lib/crm/format";

import { useDB } from "@/lib/crm/store";

import { companyConfig } from "@/lib/config/company";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      {
        title: `Inventario — ${companyConfig.name} CRM`,
      },
      {
        name: "description",
        content:
          `Inventario de ${companyConfig.name} con stock actual por producto y alertas de reposición.`,
      },
      {
        property: "og:title",
        content: `Inventario — ${companyConfig.name} CRM`,
      },
      {
        property: "og:description",
        content:
          `Stock, categorías y alertas de inventario de ${companyConfig.name}.`,
      },
    ],
  }),

  component: Inventario,
});

const statusStyles: Record<StockStatus, string> = {
  OK:
    "bg-success/15 text-success border-success/30",

  BAJO:
    "bg-warning/20 text-warning border-warning/40",

  "CRÍTICO":
    "bg-destructive/15 text-destructive border-destructive/30",

  "SIN STOCK":
    "bg-muted text-muted-foreground border-border",
};

function Inventario() {
  const db = useDB();

  const [q, setQ] =
    useState("");

  const [cat, setCat] =
    useState("Todas");

  const categories =
    useMemo(
      () => [
        "Todas",
        ...Array.from(
          new Set(
            db.products.map(
              (product) =>
                product.category,
            ),
          ),
        ),
      ],
      [db.products],
    );

  const list =
    db.products.filter(
      (product) =>
        (
          cat === "Todas" ||
          product.category === cat
        ) &&
        product.name
          .toLowerCase()
          .includes(
            q
              .trim()
              .toLowerCase(),
          ),
    );

  return (
    <AppShell
      title="Inventario"
      subtitle={`${db.products.length} productos`}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={q}
          onChange={(event) =>
            setQ(
              event.target.value,
            )
          }
          placeholder="Buscar producto..."
          className="h-12 pl-9"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {categories.map(
          (category) => (
            <Button
              key={category}
              size="sm"
              variant={
                cat === category
                  ? "default"
                  : "outline"
              }
              className="shrink-0 rounded-full"
              onClick={() =>
                setCat(category)
              }
            >
              {category}
            </Button>
          ),
        )}
      </div>

      <div className="mt-4 space-y-2">
        {list.map(
          (product) => {
            const status =
              stockStatus(
                product,
              );

            return (
              <div
                key={
                  product.id
                }
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {
                      product.name
                    }
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {
                      product.category
                    }{" "}
                    ·{" "}
                    {product.formats
                      .map(
                        (
                          format,
                        ) =>
                          `${format.label} ${clp(format.price)}`,
                      )
                      .join(
                        " · ",
                      )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Mínimo:{" "}
                    {qtyFmt(
                      product.min,
                    )}{" "}
                    {
                      product.stockUnitLabel
                    }
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-display text-lg font-bold leading-tight">
                    {stockLabel(
                      product,
                    )}
                  </p>

                  {stockKgLabel(
                    product,
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      ≈{" "}
                      {stockKgLabel(
                        product,
                      )}
                    </p>
                  )}

                  <Badge
                    variant="outline"
                    className={
                      statusStyles[
                        status
                      ]
                    }
                  >
                    {status}
                  </Badge>
                </div>
              </div>
            );
          },
        )}

        {list.length ===
          0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin resultados.
          </p>
        )}
      </div>
    </AppShell>
  );
}