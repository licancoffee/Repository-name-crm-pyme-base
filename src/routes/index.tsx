import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, ReceiptText, ShoppingCart, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { clp } from "@/lib/crm/format";
import { stockStatus } from "@/lib/crm/calc";
import { activeSales, useDB } from "@/lib/crm/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lican Coffee CRM — Ventas y stock en modo prueba" },
      {
        name: "description",
        content:
          "CRM móvil de Lican Coffee para registrar ventas de prueba, clientes, inventario e historial sin afectar el ERP real.",
      },
      { property: "og:title", content: "Lican Coffee CRM" },
      {
        property: "og:description",
        content: "Ventas de prueba, clientes, inventario e historial de Lican Coffee.",
      },
    ],
  }),
  component: Index,
});

const tiles = [
  { to: "/nueva-venta", label: "Nueva venta", desc: "Registrar venta", icon: ShoppingCart },
  { to: "/clientes", label: "Clientes", desc: "Fichas y compras", icon: Users },
  { to: "/inventario", label: "Inventario", desc: "Stock y alertas", icon: Package },
  { to: "/historial", label: "Historial", desc: "Ventas guardadas", icon: ReceiptText },
] as const;

function Index() {
  const db = useDB();
  const activas = activeSales(db);
  const totalVendido = activas.reduce((a, s) => a + s.total, 0);
  const alertas = db.products.filter((p) => stockStatus(p) !== "OK").length;

  return (
    <AppShell title="Lican Coffee CRM" subtitle="Panel principal">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Ventas" value={String(activas.length)} />
        <Stat label="Vendido" value={clp(totalVendido)} />
        <Stat label="Alertas stock" value={String(alertas)} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <t.icon className="h-5 w-5" />
            </span>
            <span className="mt-3 block">
              <span className="block font-display text-lg font-bold leading-tight">{t.label}</span>
              <span className="block text-xs text-muted-foreground">{t.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-bold">{value}</p>
    </div>
  );
}
