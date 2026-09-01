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
  
    const clientId =
      process.env.CLIENT_ID;
  
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
  
    if (!clientId) {
      throw new Error(
        "CLIENT_ID no configurado.",
      );
    }
  
    return {
      url,
      token,
      clientId,
    };
  }
  
  export async function saveSetupProducts(
    products: Product[],
  ): Promise<ProductStorageResult> {
    const {
      url,
      token,
      clientId,
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
            clientId,
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
  
    return {
      ok: true,
      message:
        typeof result?.message ===
          "string"
          ? result.message
          : "Productos guardados correctamente.",
      clientId:
        typeof result?.clientId ===
          "string"
          ? result.clientId
          : clientId,
      saved:
        typeof result?.saved ===
          "number"
          ? result.saved
          : products.length,
    };
  }
  