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
  getActiveClientId,
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
            `${clientConfig.company.name} CRM`,
        },
        {
          name: "description",
          content:
            `CRM de gestión comercial de ${clientConfig.company.name}.`,
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

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const activeClientId =
          getActiveClientId();

        const endpoint =
          activeClientId
            ? `/api/runtime-bootstrap?clientId=${encodeURIComponent(activeClientId)}`
            : "/api/runtime-bootstrap";

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
