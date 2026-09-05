import type {
  Product,
} from "@/lib/crm/types";

export type ProductStorageResult = {
  ok: boolean;
  message: string;
  clientId?: string;
  saved?: number;
};

function getStorageConfig() {
  const url =
    process.env.SETUP_STORAGE_URL;

  const token =
    process.env.SETUP_STORAGE_TOKEN;

  if (!url) {
    throw new Error(
      "SETUP_STORAGE_URL no configurado.",
    );
  }

  if (!token) {
    throw new Error(
      "SETUP_STORAGE_TOKEN no configurado.",
    );
  }

  return {
    url,
    token,
  };
}

export async function saveSetupProducts(
  products: Product[],
  clientId: string,
): Promise<ProductStorageResult> {
  const normalizedClientId =
    String(clientId || "").trim();

  if (!normalizedClientId) {
    throw new Error(
      "CLIENT_ID no configurado.",
    );
  }

  const {
    url,
    token,
  } =
    getStorageConfig();

  const response =
    await fetch(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          action:
            "guardarProductosCliente",
          token,
          clientId:
            normalizedClientId,
          products,
        }),
      },
    );

  const text =
    await response.text();

  let result:
    | Record<string, unknown>
    | null = null;

  try {
    result =
      JSON.parse(
        text,
      ) as Record<
        string,
        unknown
      >;
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      typeof result?.message ===
        "string"
        ? result.message
        : `El almacenamiento respondió ${response.status}.`,
    );
  }

  if (
    result &&
    result.ok === false
  ) {
    throw new Error(
      typeof result.message ===
        "string"
        ? result.message
        : "No fue posible guardar los productos.",
    );
  }

  const returnedClientId =
    typeof result?.clientId ===
      "string"
      ? result.clientId.trim()
      : normalizedClientId;

  if (
    returnedClientId !==
    normalizedClientId
  ) {
    throw new Error(
      "El backend respondió con otro CLIENT_ID.",
    );
  }

  return {
    ok: true,
    message:
      typeof result?.message ===
        "string"
        ? result.message
        : "Productos guardados correctamente.",
    clientId:
      returnedClientId,
    saved:
      typeof result?.saved ===
        "number"
        ? result.saved
        : products.length,
  };
}
