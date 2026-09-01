import { Link } from "@tanstack/react-router";

import {
  Building2,
  FileText,
  Home,
  Package,
  ReceiptText,
  ShoppingCart,
  Users,
} from "lucide-react";

import {
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  clientConfig,
} from "@/lib/config/client";

import {
  useErpStatus,
} from "@/lib/crm/store";

type ModuleKey =
  | "dashboard"
  | "sales"
  | "quotes"
  | "customers"
  | "inventory"
  | "history";

const navItems = [
  {
    to: "/",
    label: "Inicio",
    icon: Home,
    module: "dashboard",
  },
  {
    to: "/nueva-venta",
    label: "Venta",
    icon: ShoppingCart,
    module: "sales",
  },
  {
    to: "/cotizaciones",
    label: "Cotizaciones",
    icon: FileText,
    module: "quotes",
  },
  {
    to: "/clientes",
    label: "Clientes",
    icon: Users,
    module: "customers",
  },
  {
    to: "/inventario",
    label: "Stock",
    icon: Package,
    module: "inventory",
  },
  {
    to: "/historial",
    label: "Historial",
    icon: ReceiptText,
    module: "history",
  },
] as const satisfies ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof Home;
  module: ModuleKey;
}>;

function CompanyMark({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [
    logoFailed,
    setLogoFailed,
  ] = useState(false);

  const sizeClass =
    compact
      ? "h-8 w-8 rounded-xl"
      : "h-11 w-11 rounded-2xl";

  const iconClass =
    compact
      ? "h-4 w-4"
      : "h-6 w-6";

  const configuredLogo =
    clientConfig.branding.logoUrl ||
    clientConfig.company.logoUrl;

  const hasUsableLogo =
    Boolean(
      configuredLogo &&
      configuredLogo.trim(),
    ) &&
    !logoFailed;

  if (hasUsableLogo) {
    return (
      <div
        className={`grid shrink-0 place-items-center overflow-hidden border border-white/10 bg-white shadow-sm ${sizeClass}`}
      >
        <img
          src={configuredLogo}
          alt={`Logo ${clientConfig.company.name}`}
          className="h-full w-full object-contain p-1"
          onError={() => {
            setLogoFailed(true);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`grid shrink-0 place-items-center text-white shadow-sm ${sizeClass}`}
      style={{
        backgroundColor:
          clientConfig.branding.accentColor,
      }}
      aria-label={`Identidad ${clientConfig.company.name}`}
    >
      <Building2
        className={iconClass}
      />
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const {
    company,
    branding,
    modules,
  } = clientConfig;

  const visibleNavItems =
    navItems.filter(
      (item) =>
        modules[
          item.module
        ],
    );

  const navColumns =
    Math.max(
      visibleNavItems.length,
      1,
    );

  const shellStyle = {
    "--client-primary":
      branding.primaryColor,
    "--client-secondary":
      branding.secondaryColor,
    "--client-accent":
      branding.accentColor,
  } as CSSProperties;

  return (
    <div
      className="min-h-screen bg-background pb-24"
      style={shellStyle}
    >
      <div className="border-b border-border bg-card px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CompanyMark
              compact
            />

            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
                {company.name}
              </p>

              <p className="truncate text-[10px] text-muted-foreground">
                Gestión comercial
              </p>
            </div>
          </div>

          <ErpStatusBar />
        </div>
      </div>

      <header
        className="px-4 py-5 text-white"
        style={{
          backgroundImage:
            `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
        }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CompanyMark />

            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold leading-tight">
                {title ??
                  `${company.name} CRM`}
              </h1>

              <p className="truncate text-xs opacity-80">
                {subtitle ??
                  "Gestión comercial"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-5">
        {children}
      </main>

      {visibleNavItems.length >
        0 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div
            className="mx-auto grid max-w-3xl"
            style={{
              gridTemplateColumns:
                `repeat(${navColumns}, minmax(0, 1fr))`,
            }}
          >
            {visibleNavItems.map(
              (item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{
                    exact:
                      item.to ===
                      "/",
                  }}
                  className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors data-[status=active]:font-semibold sm:text-[11px]"
                  activeProps={{
                    style: {
                      color:
                        branding.accentColor,
                    },
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ),
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

function ErpStatusBar() {
  const status =
    useErpStatus();

  let label =
    "Modo local";

  let className =
    "border border-border bg-muted text-muted-foreground";

  if (status.loading) {
    label =
      "Sincronizando";

    className =
      "border border-border bg-secondary text-secondary-foreground";
  } else if (
    status.source ===
    "erp"
  ) {
    label =
      "Sistema conectado";

    className =
      "border border-success/30 bg-success/15 text-success";
  } else if (
    status.error
  ) {
    label =
      "Revisar conexión";

    className =
      "border border-warning/40 bg-warning/20 text-warning";
  }

  return (
    <div
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}
      title={
        status.error ||
        undefined
      }
    >
      {label}
    </div>
  );
}
