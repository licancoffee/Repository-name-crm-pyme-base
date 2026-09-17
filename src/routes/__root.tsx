import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import appCss from "../styles.css?url";

import {
  Toaster,
} from "@/components/ui/sonner";

import {
  applyRuntimeClientConfig,
  clientConfig,
  type ClientConfig,
} from "../lib/config/client";

import {
  demoClientConfig,
} from "../lib/config/demo";

import {
  getActiveClientId,
  getRequestedClientId,
  isDemoClientId,
  rememberActiveClientId,
} from "../lib/config/active-client";

import type {
  Customer,
  DB,
  Product,
} from "../lib/crm/types";

import {
  reportLovableError,
} from "../lib/lovable-error-reporting";

type RuntimeBootstrapResponse = {
  ok: boolean;
  configured: boolean;
  clientId?: string;
  updatedAt?: string;
  config?: ClientConfig | null;
  products?: Product[];
  customers?: Customer[];
  counts?: {
    products: number;
    customers: number;
  };
  message?: string;
};

function normalizeStoragePart(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function getClientStorageKey() {
  const identity =
    normalizeStoragePart(
      getActiveClientId() ||
        "demo",
    );

  return `crm-pyme-v4:${identity || "demo"}`;
}

function hydrateInstalledData(
  products: Product[],
  customers: Customer[],
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const key =
    getClientStorageKey();

  let current: DB = {
    products: [],
    customers: [],
    sales: [],
  };

  try {
    const raw =
      window.localStorage.getItem(
        key,
      );

    if (raw) {
      const parsed =
        JSON.parse(raw) as DB;

      if (
        parsed &&
        Array.isArray(parsed.products) &&
        Array.isArray(parsed.customers) &&
        Array.isArray(parsed.sales)
      ) {
        current = parsed;
      }
    }
  } catch {
    // Si el caché anterior está dañado, se reconstruye sin tocar el backend.
  }

  const next: DB = {
    ...current,
    products,
    customers,
    sales:
      Array.isArray(current.sales)
        ? current.sales
        : [],
  };

  window.localStorage.setItem(
    key,
    JSON.stringify(next),
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Página no encontrada
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);

  const router =
    useRouter();

  useEffect(() => {
    reportLovableError(
      error,
      {
        boundary:
          "tanstack_root_error_component",
      },
    );
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página no pudo cargar
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un problema inesperado. Puedes intentar nuevamente o volver al inicio.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Intentar nuevamente
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<{
    queryClient: QueryClient;
  }>()({
    head: () => ({
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1",
        },
        {
          title:
            "Kaizu — Sistema de ventas y gestión",
        },
        {
          name: "description",
          content:
            "Kaizu ayuda a pequeños negocios a ordenar ventas, clientes, stock y cotizaciones.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content:
            "summary_large_image",
        },
      ],

      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "preconnect",
          href:
            "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href:
            "https://fonts.gstatic.com",
          crossOrigin:
            "anonymous",
        },
        {
          rel: "stylesheet",
          href:
            "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
        },
        {
          rel: "icon",
          href: "/favicon.ico",
          type:
            "image/x-icon",
        },
      ],
    }),

    shellComponent:
      RootShell,

    component:
      RootComponent,

    notFoundComponent:
      NotFoundComponent,

    errorComponent:
      ErrorComponent,
  });

function RootShell({
  children,
}: {
  children: ReactNode;
}) {
  const rootStyle = {
    "--client-primary":
      clientConfig.branding
        .primaryColor,

    "--client-secondary":
      clientConfig.branding
        .secondaryColor,

    "--client-accent":
      clientConfig.branding
        .accentColor,
  } as CSSProperties;

  return (
    <html
      lang="es"
      style={rootStyle}
    >
      <head>
        <HeadContent />
      </head>

      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function KaizuWelcome() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card px-7 py-10 text-center shadow-[var(--shadow-card)] sm:px-12 sm:py-12">
        <p className="mx-auto mb-7 w-fit rounded-full bg-cyan-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-800">
          Sistema simple para pequeños negocios
        </p>

        <div className="mx-auto flex max-w-[520px] items-center justify-center gap-4 sm:gap-6">
          <img
            src="/kaizu-isotipo.png"
            alt="Isotipo de Kaizu"
            className="h-24 w-24 shrink-0 object-contain sm:h-32 sm:w-32"
          />

          <div className="text-left">
            <p
              className="text-4xl font-bold leading-none text-[#0a3766] sm:text-6xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              Kaizu
            </p>

            <p className="mt-2 whitespace-nowrap text-base font-medium text-[#0e4a87] sm:text-2xl">
              Ordena. Vende. Crece.
            </p>
          </div>
        </div>

        <h1 className="mx-auto mt-9 max-w-2xl font-display text-2xl font-bold leading-tight text-foreground sm:text-4xl">
          Controla tus ventas, clientes y stock desde un solo lugar
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Usa Kaizu desde el celular o computador, genera cotizaciones y comparte comprobantes directamente por WhatsApp.
        </p>

        <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {[
            ["Ventas ordenadas", "Registra cada venta y consulta tu historial."],
            ["Stock bajo control", "Visualiza existencias y alertas de inventario."],
            ["Clientes y cotizaciones", "Mantén la información lista para vender."],
          ].map(([title, description]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <p className="font-bold text-foreground">
                {title}
              </p>

              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl bg-secondary px-6 py-6 text-secondary-foreground">
          <p className="text-xs font-bold uppercase tracking-[0.14em]">
            Oferta fundadores · Primeros 10 clientes
          </p>

          <p className="mt-2 text-3xl font-bold">
            $19.990 + IVA
            <span className="text-base font-medium">
              {" "}/ mes
            </span>
          </p>

          <p className="mt-2 text-sm">
            Implementación inicial $39.990 + IVA · Piloto personalizado de 7 días
          </p>
        </div>

        <div className="mx-auto mt-7 flex max-w-2xl flex-col justify-center gap-3 sm:flex-row">
          <a
            href="https://demo.kaizu.cl/?clientId=KAIZU-DEMO"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#0a3766] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#082d54]"
          >
            Probar demo gratis
          </a>

          <a
            href="https://wa.me/56951012725?text=Hola%2C%20quiero%20conocer%20Kaizu%20para%20mi%20negocio."
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#0a3766] bg-white px-6 py-3 text-sm font-bold text-[#0a3766] transition-colors hover:bg-cyan-50"
          >
            Solicitar demo por WhatsApp
          </a>
        </div>

        <div className="mx-auto mt-8 max-w-2xl border-t border-border pt-6">
          <p className="text-sm font-medium text-muted-foreground">
            ¿Ya eres cliente? Utiliza el enlace de acceso personalizado asignado a tu empresa.
          </p>

          <p className="mt-3 text-xs text-muted-foreground">
            Kaizu es una solución de Lican Coffee SpA · Atención comercial por WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  const {
    queryClient,
  } =
    Route.useRouteContext();

  const [
    runtimeReady,
    setRuntimeReady,
  ] =
    useState(false);

  const [
    runtimeError,
    setRuntimeError,
  ] =
    useState("");

  const [
    requestedClientId,
    setRequestedClientId,
  ] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      const requested =
        getRequestedClientId();

      if (!active) {
        return;
      }

      setRequestedClientId(
        requested,
      );

      if (!requested) {
        setRuntimeReady(true);
        return;
      }

      if (isDemoClientId(requested)) {
        applyRuntimeClientConfig(demoClientConfig);
        setRuntimeReady(true);
        return;
      }

      try {
        const endpoint =
          `/api/runtime-bootstrap?clientId=${encodeURIComponent(requested)}`;

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

        const result =
          await response.json() as
            RuntimeBootstrapResponse;

        if (!active) {
          return;
        }

        if (result.clientId) {
          rememberActiveClientId(
            result.clientId,
          );

          setRequestedClientId(
            result.clientId,
          );
        }

        if (
          response.ok &&
          result.ok &&
          result.config
        ) {
          applyRuntimeClientConfig(
            result.config,
          );

          hydrateInstalledData(
            Array.isArray(
              result.products,
            )
              ? result.products
              : [],
            Array.isArray(
              result.customers,
            )
              ? result.customers
              : [],
          );
        } else if (
          result.message
        ) {
          setRuntimeError(
            result.message,
          );
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setRuntimeError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar la configuración.",
        );
      } finally {
        if (active) {
          setRuntimeReady(
            true,
          );
        }
      }
    }

    loadConfig();

    return () => {
      active = false;
    };
  }, []);

  if (!runtimeReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />

          <p className="mt-4 text-sm text-muted-foreground">
            Cargando configuración...
          </p>
        </div>
      </div>
    );
  }

  if (!requestedClientId) {
    return <KaizuWelcome />;
  }

  return (
    <QueryClientProvider
      client={queryClient}
    >
      {runtimeError && (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-warning">
          {runtimeError}
        </div>
      )}

      <Outlet />

      <Toaster
        position="top-center"
      />
    </QueryClientProvider>
  );
}
