import { useEffect, useState } from "react";
import { lineStockUnits, stockLabel } from "./calc";
import { getErpSnapshot } from "./erp/sheets.functions";
import { seedDB } from "./seed";
import type { Customer, DB, Product, Sale } from "./types";

/** Error de validación de stock: la venta no se guarda ni se toca inventario. */
export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

const KEY = "lican-coffee-crm-v2";

let state: DB = seedDB();
let hydrated = false;
const listeners = new Set<() => void>();

export type ErpSyncStatus = {
  loading: boolean;
  source: "erp" | "local";
  fetchedAtISO?: string;
  error?: string;
};

let erpStatus: ErpSyncStatus = { loading: false, source: "local" };
export const getErpStatus = () => erpStatus;

const emit = () => listeners.forEach((l) => l());

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed?.products?.length && parsed.products[0]?.formats) state = parsed;
    } else {
      persist();
    }
  } catch {
    /* ignore */
  }
  emit();
  void syncErp();
}

/** Stock consumido por las ventas locales activas (aún no escritas en el ERP). */
function localStockDelta(sales: Sale[]) {
  const delta = new Map<string, number>();
  for (const sale of sales) {
    if (sale.status !== "GUARDADA") continue;
    for (const line of sale.lines) {
      delta.set(line.productId, (delta.get(line.productId) ?? 0) + lineStockUnits(line));
    }
  }
  return delta;
}

/** Lee el ERP (Google Sheets) y lo deja como fuente de verdad de productos y clientes. */
export async function syncErp() {
  if (typeof window === "undefined") return;
  erpStatus = { ...erpStatus, loading: true };
  emit();
  try {
    const snap = await getErpSnapshot();
    const delta = localStockDelta(state.sales);
    const products = snap.products.map((p) => ({
      ...p,
      stock: round2(p.stock - (delta.get(p.id) ?? 0)),
    }));

    // Conservamos ajustes locales del CRM (tipo de precio y precios personalizados).
    const local = new Map(state.customers.map((c) => [c.id, c]));
    const customers: Customer[] = snap.customers.map((c) => {
      const prev = local.get(c.id);
      return prev ? { ...c, priceType: prev.priceType, customPrices: prev.customPrices } : c;
    });
    const erpIds = new Set(customers.map((c) => c.id));
    for (const c of state.customers) if (!erpIds.has(c.id)) customers.push(c);

    erpStatus = { loading: false, source: "erp", fetchedAtISO: snap.fetchedAtISO };
    set({ ...state, products, customers, erpSales: snap.sales });
  } catch (err) {
    erpStatus = {
      loading: false,
      source: "local",
      error: err instanceof Error ? err.message : "No se pudo leer el ERP",
    };
    emit();
  }
}

function set(next: DB) {
  state = next;
  persist();
  emit();
}

export function useDB() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((v) => v + 1);
    listeners.add(l);
    hydrate();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

/** Estado de la lectura del ERP (para mostrar en la UI). */
export function useErpStatus() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((v) => v + 1);
    listeners.add(l);
    hydrate();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return erpStatus;
}

/** Origen visible: ERP (Sheets) vs venta local aún no presente en el ERP. */
export function saleSource(sale: Sale): "erp" | "local" {
  return sale.erpOnly || sale.erpSynced ? "erp" : "local";
}

/**
 * Historial unificado: ventas locales no duplicadas + ventas leídas del ERP.
 * Si una venta local ya aparece en el ERP (mismo id, p. ej. ORIGEN CRM|id|…), se muestra solo la del ERP.
 */
export function visibleSales(db: DB): Sale[] {
  const erp = db.erpSales ?? [];
  const erpIds = new Set(erp.map((s) => s.id));
  const localUnsynced = db.sales.filter((s) => !s.erpOnly && !erpIds.has(s.id));
  return [...localUnsynced, ...erp].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

/** Ventas activas (no anuladas) para indicadores del dashboard. */
export function activeSales(db: DB): Sale[] {
  return visibleSales(db).filter((s) => s.status === "GUARDADA");
}

function saleIsFromErp(sale: Sale, erpSales: Sale[] | undefined) {
  if (sale.erpOnly || sale.erpSynced) return true;
  return (erpSales ?? []).some((s) => s.id === sale.id);
}


export function addCustomer(data: Omit<Customer, "id">): Customer {
  const customer: Customer = { ...data, id: `c_${Date.now()}` };
  set({ ...state, customers: [...state.customers, customer] });
  return customer;
}

export function updateCustomer(id: string, patch: Partial<Omit<Customer, "id">>) {
  set({
    ...state,
    customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}

export function setCustomerPrice(customerId: string, key: string, price: number | null) {
  set({
    ...state,
    customers: state.customers.map((c) => {
      if (c.id !== customerId) return c;
      const next = { ...(c.customPrices ?? {}) };
      if (price && price > 0) next[key] = price;
      else delete next[key];
      return { ...c, customPrices: next };
    }),
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function applyStock(products: Product[], sale: Sale, sign: 1 | -1) {
  return products.map((prod) => {
    const units = sale.lines
      .filter((l) => l.productId === prod.id)
      .reduce((a, l) => a + lineStockUnits(l), 0);
    if (!units) return prod;
    return { ...prod, stock: round2(prod.stock + sign * units) };
  });
}

function assertStockAvailable(sale: Pick<Sale, "lines">) {
  if (!sale.lines.length) {
    throw new StockError("Agrega al menos un producto");
  }
  if (sale.lines.some((l) => l.qty <= 0)) {
    throw new StockError("Hay líneas con cantidad 0");
  }

  const needed = new Map<string, number>();
  for (const line of sale.lines) {
    needed.set(line.productId, (needed.get(line.productId) ?? 0) + lineStockUnits(line));
  }

  for (const [productId, units] of needed) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) {
      const name = sale.lines.find((l) => l.productId === productId)?.name ?? productId;
      throw new StockError(`No hay stock registrado para ${name}`);
    }
    if (units > product.stock) {
      throw new StockError(`${product.name} supera el stock disponible (${stockLabel(product)})`);
    }
  }
}

export function saveSale(sale: Omit<Sale, "id" | "dateISO" | "status">): Sale {
  assertStockAvailable(sale);
  const full: Sale = {
    ...sale,
    id: `V-${Date.now().toString().slice(-8)}`,
    dateISO: new Date().toISOString(),
    status: "GUARDADA",
  };
  set({
    ...state,
    products: applyStock(state.products, full, -1),
    sales: [full, ...state.sales],
  });
  return full;
}

export function cancelSale(saleId: string) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale || sale.status === "ANULADA") return;
  // Ventas del ERP no se anulan desde el teléfono (escritura ERP desactivada).
  if (saleIsFromErp(sale, state.erpSales)) return;
  set({
    ...state,
    products: applyStock(state.products, sale, 1),
    sales: state.sales.map((s) => (s.id === saleId ? { ...s, status: "ANULADA" } : s)),
  });
}

export function resetDB() {
  set(seedDB());
}
