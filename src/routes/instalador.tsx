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
  Link2,
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

import {
  getActiveClientId,
} from "@/lib/config/active-client";

export const Route =
  createFileRoute(
    "/instalador",
  )({
    component:
      InstallerHubPage,
  });

type InstallerStatus = {
  ok: boolean;
  requestedClientId?: string;
  installationComplete?: boolean;
  operationalReady?: boolean;
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
    count: number;
    verificationAvailable: boolean;
    message: string;
    error: string;
  };
  connection: {
    checked: boolean;
    configured: boolean;
    reachable: boolean;
    ready: boolean;
    endpointConfigured: boolean;
    tokenConfigured: boolean;
    message: string;
    source?: "" | "central" | "env";
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
      const clientId =
        getActiveClientId();

      const endpoint =
        clientId
          ? `/api/installer-status?clientId=${encodeURIComponent(clientId)}`
          : "/api/installer-status";

      const response =
        await fetch(
          endpoint,
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

      if (
        clientId &&
        data.requestedClientId &&
        data.requestedClientId !== clientId
      ) {
        throw new Error(
          "El estado recibido pertenece a otro CLIENT_ID.",
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
          data.operationalReady
            ? "Instalación completa y conexión operativa verificada."
            : data.installationComplete
              ? "Empresa, productos y clientes están verificados. Falta completar la conexión operativa."
              : data.config?.completed
                ? "Configuración del cliente disponible. Continúa con los pasos pendientes."
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

  const customersCount =
    state.installer?.customers.count ?? 0;

  const customersError =
    state.installer?.customers.error || "";

  const customersReadSucceeded =
    state.installer?.customers.checked === true &&
    !customersError;

  const customersCompleted =
    state.installer?.customers.completed === true;

  const baseInstalled =
    state.installer?.installationComplete === true;

  const connectionReady =
    state.installer?.connection.ready === true;

  const connectionConfigured =
    state.installer?.connection.configured === true;

  const connectionReachable =
    state.installer?.connection.reachable === true;

  const connectionMessage =
    state.installer?.connection.message ||
    "Conexión operativa pendiente.";

  const fullyVerified =
    state.installer?.operationalReady === true;

  const activeClientId =
    state.installer?.requestedClientId ||
    state.installer?.config.clientId ||
    getActiveClientId();

  function withClientId(path: string) {
    if (!activeClientId) {
      return path;
    }

    const separator =
      path.includes("?")
        ? "&"
        : "?";

    return `${path}${separator}clientId=${encodeURIComponent(activeClientId)}`;
  }

  const nextStepHref =
    !configCompleted
      ? withClientId("/setup")
      : !productsCompleted
        ? withClientId("/setup-productos")
        : !customersCompleted
          ? withClientId("/setup-clientes")
          : withClientId("/setup-conexion");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="border-b px-4 py-6 text-white"
        style={{
          backgroundImage:
            `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
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

              {activeClientId && (
                <p className="mt-1 text-xs text-white/55">
                  {activeClientId}
                </p>
              )}
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

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Nueva instalación</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crear otra empresa sin reutilizar los datos de {companyName}.
            </p>
          </div>

          <a
            href="/setup?mode=new"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
          >
            Nueva instalación
            <ArrowRight className="h-4 w-4" />
          </a>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            icon={Users}
            label="Clientes"
            value={
              customersCompleted
                ? `${customersCount} guardados`
                : customersError
                  ? "Sin verificar"
                  : "Pendiente"
            }
            tone={
              customersCompleted
                ? "success"
                : "neutral"
            }
          />

          <StatusCard
            icon={Link2}
            label="Conexión"
            value={
              connectionReady
                ? "Lista"
                : connectionConfigured
                  ? "Pendiente"
                  : "Sin configurar"
            }
            tone={
              connectionReady
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
              activeClientId ||
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

            <div className="min-w-0">
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

              {customersError && (
                <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  Clientes: {customersError}
                </p>
              )}

              {baseInstalled && !connectionReady && (
                <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  Conexión operativa: {connectionMessage}
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
              Configura el CRM en 4 pasos
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              El Centro verifica empresa, catálogo, clientes y conexión operativa antes de declarar el CRM listo para vender.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
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
              href={withClientId("/setup")}
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
              href={withClientId("/setup-productos")}
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
                customersCompleted
                  ? `${customersCount} cliente${customersCount === 1 ? "" : "s"} verificado${customersCount === 1 ? "" : "s"} en backend.`
                  : customersError
                    ? `Verificación pendiente: ${customersError}`
                    : customersReadSucceeded
                      ? "No hay clientes iniciales guardados."
                      : "Comprobando clientes en backend."
              }
              href={withClientId("/setup-clientes")}
              action={
                customersCompleted
                  ? "Revisar clientes"
                  : "Configurar clientes"
              }
              completed={
                customersCompleted
              }
            />

            <InstallerStep
              number="04"
              icon={Link2}
              title="Conexión operativa"
              description="Vincula esta empresa con su backend propio y verifica que ventas e inventario puedan operar."
              detail={
                connectionReady
                  ? "Backend accesible y operación autorizada."
                  : connectionConfigured && connectionReachable
                    ? "Backend accesible, pero la autorización operativa aún no está completa."
                    : connectionConfigured
                      ? connectionMessage
                      : "Conexión operativa pendiente."
              }
              href={withClientId("/setup-conexion")}
              action={
                connectionReady
                  ? "Revisar conexión"
                  : "Configurar conexión"
              }
              completed={
                connectionReady
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
                  : baseInstalled
                    ? "Falta conexión operativa"
                    : "Instalación en progreso"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {fullyVerified
                  ? "Empresa, productos, clientes y conexión operativa están verificados. El CRM está listo para pruebas finales de venta."
                  : baseInstalled
                    ? "Los datos base ya están verificados. Completa el Paso 4 antes de utilizar ventas reales."
                    : "Completa los pasos pendientes. El CRM no se declarará listo para operar hasta verificar los cuatro pasos."}
              </p>
            </div>

            <a
              href={
                fullyVerified
                  ? withClientId("/")
                  : nextStepHref
              }
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
            >
              {fullyVerified
                ? "Abrir CRM"
                : "Continuar instalación"}
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
