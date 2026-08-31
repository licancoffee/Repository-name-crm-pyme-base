export type PriceType = "LISTA" | "PREFERENTE" | "PERSONALIZADO";

/** Formato de venta. `units` = cuántas unidades físicas de stock descuenta. */
export type ProductFormat = {
  label: string;
  units: number;
  price: number;
  prefPrice: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  /** Etiqueta de la unidad física de stock: "bolsa 500 g", "unidad", "caja". */
  stockUnitLabel: string;
  /** Equivalencia en kg de cada unidad física (opcional, dato secundario). */
  kgPerUnit?: number | undefined;
  /** Costo neto por unidad física de stock. */
  netCost: number;
  /** Stock en unidades físicas. */
  stock: number;
  min: number;
  formats: ProductFormat[];
  /** Formato por defecto (compatibilidad / listados). */
  format: string;
  /** Precio lista del formato por defecto. */
  price: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  priceType: PriceType;
  /** Precios personalizados por `${productId}:${formatLabel}`. */
  customPrices?: Record<string, number> | undefined;
  /** Datos históricos leídos del ERP (solo lectura). */
  erpPurchaseCount?: number | undefined;
  erpTotalAmount?: number | undefined;
  erpLastPurchaseISO?: string | undefined;
  erpStatus?: string | undefined;
};


export type SaleLine = {
  productId: string;
  name: string;
  /** Formato vendido (ej. "500 g", "1 kg"). */
  format: string;
  /** Unidades físicas de stock que descuenta cada unidad vendida. */
  formatUnits: number;
  /** Precio unitario bruto (IVA incl.) del formato. */
  price: number;
  /** Costo neto por unidad vendida (formato). */
  netCost: number;
  qty: number;
};

export type PaymentMethod = "efectivo" | "transferencia" | "debito" | "credito" | "pendiente";

export type Sale = {
  id: string;
  dateISO: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  priceType: PriceType | null;
  lines: SaleLine[];
  discountType: "monto" | "porcentaje";
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  payment: PaymentMethod;
  note: string;
  status: "GUARDADA" | "ANULADA";
  /** true = ya está escrita en Google Sheets (VENTAS/MOVIMIENTOS/INVENTARIO). */
  erpSynced?: boolean | undefined;
  /** true = venta leída del ERP (registrada en otro dispositivo). */
  erpOnly?: boolean | undefined;
};

export type DB = {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  /** Ventas leídas del ERP (otros dispositivos). Solo lectura/caché. */
  erpSales?: Sale[] | undefined;
};

