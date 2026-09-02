import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";

import {
  ContactRound,
  History,
  PackageSearch,
  ShoppingBag,
} from "lucide-react";

import {
  AppShell,
} from "@/components/AppShell";

import {
  clp,
} from "@/lib/crm/format";

import {
  stockStatus,
} from "@/lib/crm/calc";

import {
  activeSales,
  useDB,
} from "@/lib/crm/store";

import {
  clientConfig,
} from "@/lib/config/client";

export const Route =
  createFileRoute(
    "/",
  )({
    head: () => ({
      meta: [
        {
          title:
            `${clientConfig.company.name} CRM — Ventas e inventario`,
        },
        {
          name:
            "description",
          content:
            `CRM de ${clientConfig.company.name} para gestionar ventas, clientes, inventario e historial comercial.`,
        },
        {
          property:
            "og:title",
          content:
            `${clientConfig.company.name} CRM`,
        },
        {
          property:
            "og:description",
          content:
            `Gestión de ventas, clientes, inventario e historial de ${clientConfig.company.name}.`,
        },
      ],
    }),

    component:
      Index,
  });

const tiles = [
  {
    to:
      "/nueva-venta",
    label:
      "Nueva venta",
    desc:
      "Registrar venta",
    icon:
      ShoppingBag,
  },
  {
    to:
      "/clientes",
    label:
      "Clientes",
    desc:
      "Fichas y compras",
    icon:
      ContactRound,
  },
  {
    to:
      "/inventario",
    label:
      "Inventario",
    desc:
      "Stock y alertas",
    icon:
      PackageSearch,
  },
  {
    to:
      "/historial",
    label:
      "Historial",
    desc:
      "Ventas guardadas",
    icon:
      History,
  },
] as const;

function Index() {
  const db =
    useDB();

  const activas =
    activeSales(
      db,
    );

  const totalVendido =
    activas.reduce(
      (
        total,
        sale,
      ) =>
        total +
        sale.total,
      0,
    );

  const alertas =
    db.products.filter(
      (product) =>
        stockStatus(
          product,
        ) !== "OK",
    ).length;

  const companyName =
    clientConfig.company
      .name;

  return (
    <AppShell
      title={`${companyName} CRM`}
      subtitle="Panel principal"
    >
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Ventas"
          value={String(
            activas.length,
          )}
        />

        <Stat
          label="Vendido"
          value={clp(
            totalVendido,
          )}
        />

        <Stat
          label="Alertas stock"
          value={String(
            alertas,
          )}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {tiles.map(
          (tile) => (
            <Link
              key={
                tile.to
              }
              to={
                tile.to
              }
              className="flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.98]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                <tile.icon
                  className="h-5 w-5"
                  strokeWidth={1.8}
                />
              </span>

              <span className="mt-3 block">
                <span className="block font-display text-lg font-bold leading-tight">
                  {
                    tile.label
                  }
                </span>

                <span className="block text-xs text-muted-foreground">
                  {
                    tile.desc
                  }
                </span>
              </span>
            </Link>
          ),
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center shadow-[var(--shadow-card)]">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 truncate font-display text-lg font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
