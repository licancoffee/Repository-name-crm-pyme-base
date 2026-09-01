import { stockLabel } from "@/lib/crm/calc";

import type {
  DB,
  Product,
} from "@/lib/crm/types";

import type {
  KaizenToolResult,
} from "./types";

export interface KaizenStockResult {
  productId: string;
  productName: string;
  stock: number;
  stockLabel: string;
}

/**
 * Normaliza texto para realizar búsquedas tolerantes.
 *
 * Ejemplo:
 * "Producto Especial" -> "producto especial"
 */
function normalizeText(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .trim()
    .toLowerCase();
}

/**
 * Busca un producto dentro de los datos
 * actualmente cargados en el CRM.
 *
 * Esta función:
 * - no consulta directamente una fuente externa;
 * - no modifica inventario;
 * - trabaja únicamente con el estado disponible
 *   en la aplicación.
 */
function findProduct(
  db: DB,
  search: string,
): Product | undefined {
  const query =
    normalizeText(
      search,
    );

  if (!query) {
    return undefined;
  }

  /**
   * Primero intentamos una coincidencia exacta.
   */
  const exact =
    db.products.find(
      (product) =>
        normalizeText(
          product.name,
        ) === query,
    );

  if (exact) {
    return exact;
  }

  /**
   * Si no existe coincidencia exacta,
   * buscamos una coincidencia parcial.
   */
  return db.products.find(
    (product) =>
      normalizeText(
        product.name,
      ).includes(
        query,
      ),
  );
}

/**
 * Consulta el stock disponible de un producto
 * utilizando los datos cargados en el CRM.
 *
 * Esta herramienta es solo lectura.
 */
export function consultarStock(
  db: DB,
  producto: string,
): KaizenToolResult<KaizenStockResult> {
  const search =
    producto.trim();

  if (!search) {
    return {
      ok: false,

      error:
        "PRODUCTO_REQUERIDO",

      message:
        "Debes indicar qué producto deseas consultar.",
    };
  }

  const product =
    findProduct(
      db,
      search,
    );

  if (!product) {
    return {
      ok: false,

      error:
        "PRODUCTO_NO_ENCONTRADO",

      message:
        `No encontré el producto "${producto}" en el CRM.`,
    };
  }

  const result:
    KaizenStockResult = {
      productId:
        product.id,

      productName:
        product.name,

      stock:
        product.stock,

      stockLabel:
        stockLabel(
          product,
        ),
    };

  return {
    ok: true,

    data:
      result,

    message:
      `${product.name}: ${result.stockLabel} disponibles.`,
  };
}
