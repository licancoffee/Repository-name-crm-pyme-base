import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  Database,
  Loader2,
  PackagePlus,
  RefreshCw,
  Rocket,
  Settings2,
  Users,
} from "lucide-react";

import {
  clientConfig,
  type ClientConfig,
} from "@/lib/config/client";

export const Route =
  createFileRoute(
    "/instalador",
  )({
    component:
      InstallerHubPage,
  });

type InstallerStatus = {
  ok: boolean;
  config: {
    checked: boolean;
    completed: boolean;
    clientId: string;
    updatedAt: string;
    data: ClientConfig | null;
    error: string;
  };
  products: {
    checked: boolean;
    completed: boolean;
    count: number;
    error: string;
  };
  customers: {
    checked: boolean;
    completed: boolean;
    count: number | null;
    verificationAvailable: boolean;
    message: string;
  };
};

type PageState = {
  status: "loading" | "ready" | "error";
  config: ClientConfig;
  installer: InstallerStatus | null;
  message: string;
};

function InstallerHubPage() {
  const [state, setState] =
    useState<PageState>({
      status: "loading",
      config: clientConfig,
      installer: null,
      message:
        "Revisando estado de la instalación...",
    });

  async function loadStatus() {
    setState((current) => ({
      ...current,
      status: "loading",
      message:
        "Revisando estado de la instalación...",
    }));

    try {
      const response =
        await fetch(
          "/api/installer-status",
          {
            headers: {
              Accept:
                "application/json",
            },
            cache: "no-store",
          },
        );

      const data =
        (await response.json()) as InstallerStatus;

      if (!response.ok) {
        throw new Error(
          "No fue posible consultar el estado del instalador.",
        );
      }

      const remoteConfig =
        data.config?.completed &&
        data.config.data
          ? data.config.data
          : clientConfig;

      setState({
        status: "ready",
        config: remoteConfig,
        installer: data,
        message:
          data.config?.completed
            ? "Configuración del cliente disponible."
            : data.config?.error ||
              "La configuración de empresa todavía está pendiente.",
      });
    } catch (error) {
      setState({
        status: "error",
        config: clientConfig,
        installer: null,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible revisar el estado del instalador.",
      });
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  const companyName =
    state.config.company.name ||
    "Nuevo cliente";

  const branding =
    state.config.branding;

  const activeModules =
    useMemo(
      () =>
        Object.values(
          state.config.modules,
        ).filter(Boolean).length,
      [state.config.modules],
    );

  const configCompleted =
    state.installer?.config.completed === true;

  const productsCompleted =
    state.installer?.products.completed === true;

  const productsCount =
    state.installer?.products.count ?? 0;

  const customersVerified =
    state.installer?.customers.verificationAvailable === true;

  const customersCompleted =
    state.installer?.customers.completed === true;

  const fullyVerified =
    configCompleted &&
    productsCompleted &&
    customersVerified &&
    customersCompleted;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="border-b px-4 py-6 text-white"
        style={{
          backgroundImage:
            `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl shadow-sm"
              style={{
                backgroundColor:
                  branding.accentColor,
              }}
            >
              <Rocket className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                CRM Base · Instalador
              </p>

              <h1 className="text-2xl font-bold">
                Centro de instalación
              </h1>

              <p className="mt-1 text-sm text-white/75">
                {companyName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadStatus()
            }
            disabled={
              state.status ===
              "loading"
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.status ===
            "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar estado
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatusCard
            icon={Database}
            label="Configuración"
            value={
              configCompleted
                ? "Guardada"
                : "Pendiente"
            }
            tone={
              configCompleted
                ? "success"
                : "neutral"
            }
          />

          <StatusCard
            icon={PackagePlus}
            label="Productos"
            value={
              productsCompleted
                ? `${productsCount} guardados`
                : "Pendiente"
            }
            tone={
              productsCompleted
                ? "success"
                : "neutral"
            }
          />

          <StatusCard
            icon={Settings2}
            label="Módulos activos"
            value={String(
              activeModules,
            )}
            tone="neutral"
          />

          <StatusCard
            icon={Building2}
            label="Cliente"
            value={
              state.installer?.config.clientId ||
              companyName
            }
            tone="neutral"
          />
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            {state.status ===
            "loading" ? (
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-muted-foreground" />
            ) : fullyVerified ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            )}

            <div>
              <h2 className="font-semibold">
                Estado del instalador
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {state.message}
              </p>

              {state.installer?.config.updatedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Última actualización: {state.installer.config.updatedAt}
                </p>
              )}

              {!customersVerified && (
                <p className="mt-3 rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Clientes: guardado disponible, pero la lectura remota para verificar cantidad todavía no está implementada en el backend. No se marcará como completado hasta poder comprobarlo de forma real.
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Flujo de instalación
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Configura el CRM en 3 pasos
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              El Centro verifica automáticamente lo que ya existe en el backend y evita marcar pasos como completos sin evidencia real.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <InstallerStep
              number="01"
              icon={Building2}
              title="Empresa y módulos"
              description="Define empresa, marca, módulos, pagos, despacho y WhatsApp."
              detail={
                configCompleted
                  ? "Configuración verificada en backend."
                  : "Configuración pendiente."
              }
              href="/setup"
              action={
                configCompleted
                  ? "Revisar configuración"
                  : "Configurar empresa"
              }
              completed={
                configCompleted
              }
            />

            <InstallerStep
              number="02"
              icon={PackagePlus}
              title="Productos"
              description="Carga y valida el catálogo inicial que utilizarán ventas e inventario."
              detail={
                productsCompleted
                  ? `${productsCount} producto${productsCount === 1 ? "" : "s"} verificado${productsCount === 1 ? "" : "s"} en backend.`
                  : state.installer?.products.error ||
                    "Aún no hay productos verificados."
              }
              href="/setup-productos"
              action={
                productsCompleted
                  ? "Revisar productos"
                  : "Configurar productos"
              }
              completed={
                productsCompleted
              }
            />

            <InstallerStep
              number="03"
              icon={Users}
              title="Clientes"
              description="Carga clientes iniciales y deja preparada la base comercial."
              detail={
                customersVerified
                  ? customersCompleted
                    ? `${state.installer?.customers.count ?? 0} clientes verificados.`
                    : "No hay clientes guardados."
                  : "Pendiente de verificación remota."
              }
              href="/setup-clientes"
              action="Configurar clientes"
              completed={
                customersVerified &&
                customersCompleted
              }
            />
          </div>
        </section>

        <section
          className={
            fullyVerified
              ? "rounded-2xl border border-success/30 bg-success/10 p-5 shadow-sm"
              : "rounded-2xl border bg-card p-5 shadow-sm"
          }
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                {fullyVerified
                  ? "Instalación completa"
                  : "CRM Base"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {fullyVerified
                  ? "Empresa, productos y clientes están verificados. El CRM está listo para validación operativa."
                  : "Puedes abrir el CRM para validar los módulos, pero el Centro todavía no declara la instalación como completa hasta verificar todos los pasos."}
              </p>
            </div>

            <a
              href="/"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
            >
              Abrir CRM
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

function InstallerStep({
  number,
  icon: Icon,
  title,
  description,
  detail,
  href,
  action,
  completed,
}: {
  number: string;
  icon: typeof Building2;
  title: string;
  description: string;
  detail: string;
  href: string;
  action: string;
  completed: boolean;
}) {
  return (
    <article className="flex min-h-72 flex-col rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-muted">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex items-center gap-2">
          {completed && (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}

          <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground">
            {number}
          </span>
        </div>
      </div>

      <h3 className="mt-5 text-lg font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <p className="mt-3 flex-1 text-xs font-medium text-muted-foreground">
        {detail}
      </p>

      <a
        href={href}
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold transition hover:border-primary/40 hover:bg-muted"
      >
        {action}
        <ArrowRight className="h-4 w-4" />
      </a>
    </article>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  tone:
    | "success"
    | "neutral";
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={
            tone === "success"
              ? "grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success"
              : "grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground"
          }
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>

          <p className="mt-1 truncate font-bold">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
