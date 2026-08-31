import type { Customer, DB, Product, Sale } from "../types";

/**
 * Capa de integración con el ERP (Google Sheets de Lican Coffee).
 *
 * MODO PRUEBA: hoy la app usa `localAdapter` (localStorage). Cuando se
 * autorice la conexión, basta implementar `SheetsAdapter` con los mismos
 * métodos y cambiar `getErpAdapter()`; el resto de la app no cambia.
 *
 * Entidades previstas en el ERP:
 *  - clientes    -> Customer
 *  - productos   -> Product (precio lista / preferente por formato)
 *  - inventario  -> Product.stock (unidades físicas) + equivalencia kg
 *  - ventas      -> Sale
 *  - historial   -> Sale (estado GUARDADA / ANULADA)
 *  - movimientos -> StockMovement
 */
export type StockMovement = {
  id: string;
  dateISO: string;
  productId: string;
  /** Unidades físicas de stock (positivo entra, negativo sale). */
  units: number;
  reason: "VENTA" | "ANULACION" | "AJUSTE" | "COMPRA";
  refId?: string;
};

export interface ErpAdapter {
  readonly name: string;
  readonly connected: boolean;
  listCustomers(): Promise<Customer[]>;
  listProducts(): Promise<Product[]>;
  listSales(): Promise<Sale[]>;
  pushCustomer(customer: Customer): Promise<void>;
  pushSale(sale: Sale): Promise<void>;
  pushStockMovement(movement: StockMovement): Promise<void>;
}

/** Adaptador local (prototipo). No toca el ERP real. */
export function createLocalAdapter(getDB: () => DB): ErpAdapter {
  return {
    name: "local-prototipo",
    connected: false,
    async listCustomers() {
      return getDB().customers;
    },
    async listProducts() {
      return getDB().products;
    },
    async listSales() {
      return getDB().sales;
    },
    async pushCustomer() {
      /* no-op en modo prueba */
    },
    async pushSale() {
      /* no-op en modo prueba */
    },
    async pushStockMovement() {
      /* no-op en modo prueba */
    },
  };
}
