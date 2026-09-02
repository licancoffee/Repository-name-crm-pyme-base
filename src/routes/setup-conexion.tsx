import {
  useEffect,
  useState,
} from "react";

import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export const Route =
  createFileRoute(
    "/setup-conexion",
  )({
    component:
      SetupConexionPage,
  });

type InstallerStatus = {
  requestedClientId?: string;
  installationComplete?: boolean;
  operationalReady?: boolean;
  connection?: {
    checked: boolean;
    configured: boolean;
    reachable: boolean;
    ready: boolean;
    endpointConfigured: boolean;
    tokenConfigured: boolean;
    message: string;
  };
};

function getInstallationClientId() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    new URLSearchParams(
      window.location.search,
    ).get("clientId")?.trim() || ""
  );
}

function SetupConexionPage() {
  const [status, setStatus] =
    useState<InstallerStatus | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const clientId =
        getInstallationClientId();

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
        await response.json() as
          InstallerStatus;

      if (!response.ok) {
        throw new Error(
          "No fue posible revisar la conexión.",
        );
      }

      if (
        clientId &&
        data?.requestedClientId &&
        data.requestedClientId !== clientId
      ) {
        throw new Error(
          "El estado recibido pertenece a otro CLIENT_ID.",
        );
      }

      setStatus(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible revisar la conexión.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const connection =
    status?.connection;

  const ready =
    connection?.ready === true;

  const clientId =
    getInstallationClientId();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-slate-900 px-4 py-6 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-500">
              <Link2 className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Instalador automático
              </p>
              <h1 className="text-2xl font-bold">
                Conexión operativa
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Paso 4 · Integración de ventas
              </p>
              {clientId && (
                <p className="mt-1 text-xs text-white/55">
                  {clientId}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Verificar
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <a
          href="/instalador"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Centro de instalación
        </a>

        {error && (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
            {error}
          </section>
        )}

        <section
          className={
            ready
              ? "rounded-2xl border border-success/30 bg-success/10 p-5 shadow-sm"
              : "rounded-2xl border bg-card p-5 shadow-sm"
          }
        >
          <div className="flex items-start gap-3">
            {loading ? (
              <Loader2 className="mt-0.5 h-6 w-6 animate-spin text-muted-foreground" />
            ) : ready ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-success" />
            ) : (
              <CircleAlert className="mt-0.5 h-6 w-6 text-warning" />
            )}

            <div>
              <h2 className="text-lg font-bold">
                {ready
                  ? "Sistema listo para vender"
                  : "Conexión pendiente"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {loading
                  ? "Comprobando el backend operativo..."
                  : connection?.message ||
                    "Todavía no se ha podido verificar la conexión."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <CheckCard
            label="ERP_APPS_SCRIPT_URL"
            description="Endpoint operativo propio de esta empresa."
            ok={
              connection?.endpointConfigured ===
              true
            }
          />

          <CheckCard
            label="CRM_API_TOKEN"
            description="Credencial privada propia de esta empresa."
            ok={
              connection?.tokenConfigured ===
              true
            }
          />

          <CheckCard
            label="Backend accesible"
            description="El servidor pudo contactar el endpoint de esta instalación."
            ok={
              connection?.reachable ===
              true
            }
          />

          <CheckCard
            label="Operación autorizada"
            description="El backend propio respondió correctamente al ping seguro."
            ok={ready}
          />
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">
                Regla de seguridad
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Una empresa nueva no puede reutilizar silenciosamente la conexión operativa de otro CLIENT_ID. Cada instalación debe tener su propio backend operativo.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">
            Estado comercial
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {status?.installationComplete
              ? "Empresa, productos y clientes ya están instalados."
              : "Todavía faltan datos del instalador base."}
          </p>

          <p className="mt-2 text-sm font-semibold">
            {status?.operationalReady
              ? "✅ Instalación completa y conexión de ventas verificada."
              : "⚠️ No registrar ventas reales hasta completar la conexión propia de esta empresa."}
          </p>
        </section>
      </main>
    </div>
  );
}

function CheckCard({
  label,
  description,
  ok,
}: {
  label: string;
  description: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        ) : (
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        )}

        <div>
          <p className="font-semibold">
            {label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
