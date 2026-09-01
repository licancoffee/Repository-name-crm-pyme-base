import type {
  Customer,
  DB,
  Product,
} from "./types";

/**
 * Instalación comercial limpia.
 *
 * Una empresa nueva no recibe productos, clientes ni ventas demo.
 * Sus datos deben venir de:
 * - carga manual,
 * - importación,
 * - integración con Google Sheets / Apps Script,
 * - o el asistente de instalación.
 */
export const seedProducts: Product[] = [];

export const seedCustomers: Customer[] = [];

export const seedDB = (): DB => ({
  products: [],
  customers: [],
  sales: [],
});
