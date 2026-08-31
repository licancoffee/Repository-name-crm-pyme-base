import { Link } from "@tanstack/react-router";

import {
  Coffee,
  FileText,
  Home,
  Package,
  ReceiptText,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { ReactNode } from "react";

import { useErpStatus } from "@/lib/crm/store";

const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/nueva-venta", label: "Venta", icon: ShoppingCart },
  { to: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/inventario", label: "Stock", icon: Package },
  { to: "/historial", label: "Historial", icon: ReceiptText },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-brand px-4 py-1.5 text-center text-[11px] font-bold tracking-wide text-brand-foreground sm:text-xs">
        LICAN COFFEE CRM
      </div>

      <ErpStatusBar />

      <header
        className="px-4 py-5 text-primary-foreground"
        style={{ backgroundImage: "var(--gradient-coffee)" }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground">
              <Coffee className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold leading-tight">
                {title}
              </h1>

              <p className="truncate text-xs opacity-80">
                {subtitle ?? "Lican Coffee CRM"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-5">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-6">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors data-[status=active]:text-brand sm:text-[11px]"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ErpStatusBar() {
  const st = useErpStatus();

  let label = "Sin conexión ERP · datos locales";
  let className = "bg-muted text-muted-foreground";

  if (st.loading) {
    label = "Sincronizando con el ERP…";
    className = "bg-secondary text-secondary-foreground";
  } else if (st.source === "erp") {
    label = "ERP conectado";
    className = "bg-success/15 text-success";
  } else if (st.error) {
    label = "Error de sincronización · datos locales";
    className = "bg-warning/20 text-warning";
  }

  return (
    <div
      className={`px-4 py-1 text-center text-[11px] font-medium ${className}`}
      title={st.error || undefined}
    >
      {label}
    </div>
  );
}