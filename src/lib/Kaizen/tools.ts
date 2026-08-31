import { stockLabel } from "@/lib/crm/calc";

import type { DB, Product } from "@/lib/crm/types";

import type { KaizenToolResult } from "./types";


export interface KaizenStockResult {
  productId: string;
  productName: string;
  stock: number;
  stockLabel: string;
}


/**
 * Normaliza texto para realizar búsquedas más tolerantes.
 *
 * Ejemplo:
 * "Cappuccino Tradicional" -> "cappuccino tradicional"
 */
function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}


/**
 * Busca un producto dentro de los datos que ya tiene cargados el CRM.
 *
 * IMPORTANTE:
 * Esta función NO consulta directamente Google Sheets.
 * Tampoco modifica inventario.
 *
 * El CRM ya sincroniza el ERP mediante syncErp().
 * Kaizen solamente utiliza esos datos.
 */
function findProduct(
  db: DB,
  search: string,
): Product | undefined {

  const query = normalizeText(search);

  if (!query) return undefined;


  // Primero buscamos coincidencia exacta.
  const exact = db.products.find(
    (product) =>
      normalizeText(product.name) === query,
  );

  if (exact) return exact;


  // Si no existe coincidencia exacta,
  // buscamos una coincidencia parcial.
  return db.products.find((product) =>
    normalizeText(product.name).includes(query),
  );
}


/**
 * Primera herramienta real de Kaizen.
 *
 * Consulta el stock disponible de un producto utilizando
 * los datos ya sincronizados por el CRM.
 *
 * Esta función es SOLO LECTURA.
 */
export function consultarStock(
  db: DB,
  producto: string,
): KaizenToolResult<KaizenStockResult> {

  const search = producto.trim();

  if (!search) {
    return {
      ok: false,
      error: "PRODUCTO_REQUERIDO",
      message:
        "Debes indicar qué producto deseas consultar.",
    };
  }


  const product = findProduct(db, search);

  if (!product) {
    return {
      ok: false,
      error: "PRODUCTO_NO_ENCONTRADO",
      message:
        `No encontré el producto "${producto}" en el CRM.`,
    };
  }


  const result: KaizenStockResult = {
    productId: product.id,
    productName: product.name,
    stock: product.stock,
    stockLabel: stockLabel(product),
  };


  return {
    ok: true,
    data: result,
    message:
      `${product.name}: ${result.stockLabel} disponibles.`,
  };
}