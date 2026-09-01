import type {
  Customer,
  DB,
  Product,
  Sale,
} from "../types";

/**
 * Capa de integración con la fuente de datos principal del CRM.
 *
 * La aplicación consume siempre la misma interfaz, independientemente
 * de si los datos provienen de Google Sheets, Apps Script, una API,
 * una base de datos externa o almacenamiento local.
 *
 * Entidades principales:
 *  - clientes    -> Customer
 *  - productos   -> Product
 *  - inventario  -> Product.stock
 *  - ventas      -> Sale
 *  - historial   -> Sale
 *  - movimientos -> StockMovement
 */

export type StockMovement = {
  id: string;
  dateISO: string;
  productId: string;

  /**
   * Unidades físicas de stock.
   * Positivo = entrada.
   * Negativo = salida.
   */
  units: number;

  reason:
    | "VENTA"
    | "ANULACION"
    | "AJUSTE"
    | "COMPRA";

  refId?: string;
};

export interface ErpAdapter {
  readonly name: string;
  readonly connected: boolean;

  listCustomers(): Promise<Customer[]>;

  listProducts(): Promise<Product[]>;

  listSales(): Promise<Sale[]>;

  pushCustomer(
    customer: Customer,
  ): Promise<void>;

  pushSale(
    sale: Sale,
  ): Promise<void>;

  pushStockMovement(
    movement: StockMovement,
  ): Promise<void>;
}

/**
 * Adaptador local.
 *
 * Se utiliza como respaldo cuando no existe una integración externa
 * configurada o durante instalaciones iniciales.
 */
export function createLocalAdapter(
  getDB: () => DB,
): ErpAdapter {
  return {
    name: "local",

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
      /**
       * El almacenamiento local ya gestiona
       * los cambios desde la capa de estado.
       */
    },

    async pushSale() {
      /**
       * El almacenamiento local ya gestiona
       * los cambios desde la capa de estado.
       */
    },

    async pushStockMovement() {
      /**
       * El almacenamiento local ya gestiona
       * los cambios desde la capa de estado.
       */
    },
  };
}
