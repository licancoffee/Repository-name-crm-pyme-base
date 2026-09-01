import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  loadRemoteClientConfig,
} from "@/lib/setup/client-config.server";

import {
  readInstalledProducts,
} from "@/lib/setup/products-read.server";

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
      },
    },
  );
}

async function handleGet() {
  const result = {
    ok: true,
    config: {
      checked: false,
      completed: false,
      clientId: "",
      updatedAt: "",
      data: null as unknown,
      error: "",
    },
    products: {
      checked: false,
      completed: false,
      count: 0,
      error: "",
    },
    customers: {
      checked: false,
      completed: false,
      count: null as number | null,
      verificationAvailable: false,
      message:
        "La lectura remota de clientes todavía no está implementada en el backend del instalador.",
    },
  };

  try {
    const config =
      await loadRemoteClientConfig();

    result.config.checked = true;
    result.config.completed =
      config.configured === true;

    if (
      config.configured === true
    ) {
      result.config.clientId =
        config.clientId || "";
      result.config.updatedAt =
        config.updatedAt || "";
      result.config.data =
        config.config;
    }
  } catch (error) {
    result.config.checked = true;
    result.config.error =
      error instanceof Error
        ? error.message
        : "No fue posible revisar la configuración.";
  }

  try {
    const products =
      await readInstalledProducts();

    result.products.checked = true;
    result.products.count =
      products.count;
    result.products.completed =
      products.count > 0;
  } catch (error) {
    result.products.checked = true;
    result.products.error =
      error instanceof Error
        ? error.message
        : "No fue posible revisar los productos.";
  }

  return jsonResponse(result);
}

export const Route =
  createFileRoute(
    "/api/installer-status",
  )({
    server: {
      handlers: {
        GET: () =>
          handleGet(),
      },
    },
  });
