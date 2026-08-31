import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { stockKgLabel, stockLabel, stockStatus, type StockStatus } from "@/lib/crm/calc";
import { clp, qtyFmt } from "@/lib/crm/format";
import { useDB } from "@/lib/crm/store";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — Lican Coffee CRM" },
      {
        name: "description",
        content: "Stock actual por producto con estados OK, BAJO, CRÍTICO y SIN STOCK.",
      },
      { property: "og:title", content: "Inventario — Lican Coffee CRM" },
      { property: "og:description", content: "Stock y alertas del catálogo Lican Coffee." },
    ],
  }),
  component: Inventario,
});

const statusStyles: Record<StockStatus, string> = {
  OK: "bg-success/15 text-success border-success/30",
  BAJO: "bg-warning/20 text-warning border-warning/40",
  "CRÍTICO": "bg-destructive/15 text-destructive border-destructive/30",
  "SIN STOCK": "bg-muted text-muted-foreground border-border",
};

function Inventario() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(db.products.map((p) => p.category)))],
    [db.products],
  );

  const list = db.products.filter(
    (p) =>
      (cat === "Todas" || p.category === cat) &&
      p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <AppShell title="Inventario" subtitle={`${db.products.length} productos`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto..."
          className="h-12 pl-9"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={cat === c ? "default" : "outline"}
            className="shrink-0 rounded-full"
            onClick={() => setCat(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {list.map((p) => {
          const st = stockStatus(p);
          return (
            <div
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category} · {p.formats.map((f) => `${f.label} ${clp(f.price)}`).join(" · ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mínimo: {qtyFmt(p.min)} {p.stockUnitLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold leading-tight">{stockLabel(p)}</p>
                {stockKgLabel(p) && (
                  <p className="text-xs text-muted-foreground">≈ {stockKgLabel(p)}</p>
                )}
                <Badge variant="outline" className={statusStyles[st]}>
                  {st}
                </Badge>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados.</p>
        )}
      </div>
    </AppShell>
  );
}
