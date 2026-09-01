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

type RemoteConfigState =
  | {
      status: "loading";
      config: ClientConfig;
      configured: false;
      message: string;
    }
  | {
      status: "ready";
      config: ClientConfig;
      configured: boolean;
      message: string;
      clientId?: string;
      updatedAt?: string;
    }
  | {
      status: "error";
      config: ClientConfig;
      configured: false;
      message: string;
    };

function InstallerHubPage() {
  const [state, setState] =
    useState<RemoteConfigState>({
      status: "loading",
      config: clientConfig,
      configured: false,
      message:
        "Revisando configuración del cliente...",
    });

  async function loadConfig() {
    setState((current) => ({
      status: "loading",
      config: current.config,
      configured: false,
      message:
        "Revisando configuración del cliente...",
    }));

    try {
      const response =
        await fetch(
          "/api/client-config",
          {
            headers: {
              Accept:
                "application/json",
            },
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "No fue posible consultar la configuración.",
        );
      }

      const configured =
        data?.configured === true &&
        Boolean(data?.config);

      setState({
        status: "ready",
        config:
          configured
            ? data.config
            : clientConfig,
        configured,
        clientId:
          data?.clientId,
        updatedAt:
          data?.updatedAt,
        message:
          configured
            ? "Configuración del cliente disponible."
            : data?.reason ||
              "Todavía no existe una configuración remota para esta instalación.",
      });
    } catch (error) {
      setState({
        status: "error",
        config: clientConfig,
        configured: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible revisar el estado del instalador.",
      });
    }
  }

  useEffect(() => {
    void loadConfig();
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
              void loadConfig()
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
        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={Database}
            label="Configuración"
            value={
              state.configured
                ? "Guardada"
                : "Pendiente"
            }
            tone={
              state.configured
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
              state.clientId ||
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
            ) : state.configured ? (
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

              {state.updatedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Última actualización: {state.updatedAt}
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
              Cada paso utiliza el backend del instalador. Puedes volver a este centro en cualquier momento para revisar el estado y continuar.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <InstallerStep
              number="01"
              icon={Building2}
              title="Empresa y módulos"
              description="Define empresa, marca, módulos, pagos, despacho y WhatsApp."
              href="/setup"
              action={
                state.configured
                  ? "Revisar configuración"
                  : "Configurar empresa"
              }
              completed={
                state.configured
              }
            />

            <InstallerStep
              number="02"
              icon={PackagePlus}
              title="Productos"
              description="Carga y valida el catálogo inicial que utilizarán ventas e inventario."
              href="/setup-productos"
              action="Configurar productos"
              completed={false}
            />

            <InstallerStep
              number="03"
              icon={Users}
              title="Clientes"
              description="Carga clientes iniciales y deja preparada la base comercial."
              href="/setup-clientes"
              action="Configurar clientes"
              completed={false}
            />
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                CRM Base
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Cuando termines la instalación puedes entrar al CRM para validar dashboard, ventas, clientes, inventario, historial y cotizaciones.
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
  href,
  action,
  completed,
}: {
  number: string;
  icon: typeof Building2;
  title: string;
  description: string;
  href: string;
  action: string;
  completed: boolean;
}) {
  return (
    <article className="flex min-h-64 flex-col rounded-2xl border bg-card p-5 shadow-sm">
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

      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {description}
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
