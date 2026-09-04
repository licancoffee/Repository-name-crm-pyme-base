import {
  useEffect,
  useState,
} from "react";

import {
  getActiveClientId,
} from "@/lib/config/active-client";

import {
  lineStockUnits,
  stockLabel,
} from "./calc";

import {
  getErpSnapshot,
} from "./erp/sheets.functions";

import {
  getInstalledProducts,
} from "@/lib/setup/products.functions";

import {
  seedDB,
} from "./seed";

import type {
  Customer,
  DB,
  Product,
  Sale,
} from "./types";

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

let state: DB = seedDB();
let hydrated = false;
let activeStorageKey = "";

const listeners =
  new Set<() => void>();

export type ErpSyncStatus = {
  loading: boolean;
  source: "erp" | "local";
  fetchedAtISO?: string;
  error?: string;
};

let erpStatus: ErpSyncStatus = {
  loading: false,
  source: "local",
};

export const getErpStatus = () =>
  erpStatus;

const emit = () => {
  listeners.forEach(
    (listener) => listener(),
  );
};

function normalizeStoragePart(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function getStorageKey() {
  const identity =
    normalizeStoragePart(
      getActiveClientId() ||
        "demo",
    );

  return `crm-pyme-v4:${identity || "demo"}`;
}

function ensureClientNamespace() {
  const nextKey =
    getStorageKey();

  if (
    activeStorageKey &&
    activeStorageKey !== nextKey
  ) {
    state = seedDB();
    hydrated = false;

    erpStatus = {
      loading: false,
      source: "local",
    };
  }

  activeStorageKey =
    nextKey;

  return nextKey;
}

function persist() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    const key =
      ensureClientNamespace();

    window.localStorage.setItem(
      key,
      JSON.stringify(state),
    );
  } catch {
    // localStorage funciona solo como caché local.
  }
}

function set(next: DB) {
  state = next;
  persist();
  emit();
}

function hydrate() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const key =
    ensureClientNamespace();

  if (hydrated) {
    return;
  }

  hydrated = true;

  try {
    const raw =
      window.localStorage.getItem(
        key,
      );

    if (raw) {
      const parsed =
        JSON.parse(raw) as DB;

      if (
        parsed &&
        Array.isArray(
          parsed.products,
        ) &&
        Array.isArray(
          parsed.customers,
        ) &&
        Array.isArray(
          parsed.sales,
        )
      ) {
        state = parsed;
      } else {
        state = seedDB();
        persist();
      }
    } else {
      state = seedDB();
      persist();
    }
  } catch {
    state = seedDB();
  }

  emit();

  void syncSources();
}

async function syncSources() {
  await syncInstalledProducts();
  await syncErp();
}

export async function syncInstalledProducts() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    const result =
      await getInstalledProducts();

    const products =
      result.products.map(
        (product) => ({
          ...product,
          formats:
            product.formats.map(
              (format) => ({
                ...format,
              }),
            ),
        }),
      );

    set({
      ...state,
      products,
    });
  } catch (error) {
    console.warn(
      "[INSTALLER PRODUCTS]",
      error,
    );
  }
}

function localStockDelta(
  sales: Sale[],
) {
  const delta =
    new Map<string, number>();

  for (
    const sale of sales
  ) {
    if (
      sale.status !== "GUARDADA"
    ) {
      continue;
    }

    for (
      const line of sale.lines
    ) {
      delta.set(
        line.productId,
        (
          delta.get(
            line.productId,
          ) ?? 0
        ) +
          lineStockUnits(line),
      );
    }
  }

  return delta;
}

export async function syncErp() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  ensureClientNamespace();

  erpStatus = {
    ...erpStatus,
    loading: true,
    error: undefined,
  };

  emit();

  try {
    const snap =
      await getErpSnapshot();

    const delta =
      localStockDelta(
        state.sales,
      );

    const products =
      snap.products.map(
        (product) => ({
          ...product,
          stock:
            round2(
              product.stock -
                (
                  delta.get(
                    product.id,
                  ) ?? 0
                ),
            ),
        }),
      );

    const localCustomers =
      new Map(
        state.customers.map(
          (customer) => [
            customer.id,
            customer,
          ],
        ),
      );

    const customers:
      Customer[] =
      snap.customers.map(
        (customer) => {
          const previous =
            localCustomers.get(
              customer.id,
            );

          return previous
            ? {
                ...customer,
                priceType:
                  previous.priceType,
                customPrices:
                  previous.customPrices,
              }
            : customer;
        },
      );

    const remoteIds =
      new Set(
        customers.map(
          (customer) =>
            customer.id,
        ),
      );

    for (
      const customer of state.customers
    ) {
      if (
        !remoteIds.has(
          customer.id,
        )
      ) {
        customers.push(
          customer,
        );
      }
    }

    erpStatus = {
      loading: false,
      source: "erp",
      fetchedAtISO:
        snap.fetchedAtISO,
    };

    set({
      ...state,
      products,
      customers,
      erpSales:
        snap.sales,
    });
  } catch (error) {
    erpStatus = {
      loading: false,
      source: "local",
      error:
        error instanceof Error
          ? error.message
          : "No se pudo leer la fuente de datos",
    };

    emit();
  }
}

export function useDB() {
  const [, force] =
    useState(0);

  useEffect(() => {
    const listener = () =>
      force(
        (value) => value + 1,
      );

    listeners.add(
      listener,
    );

    hydrate();

    return () => {
      listeners.delete(
        listener,
      );
    };
  }, []);

  return state;
}

export function useErpStatus() {
  const [, force] =
    useState(0);

  useEffect(() => {
    const listener = () =>
      force(
        (value) => value + 1,
      );

    listeners.add(
      listener,
    );

    hydrate();

    return () => {
      listeners.delete(
        listener,
      );
    };
  }, []);

  return erpStatus;
}

export function saleSource(
  sale: Sale,
): "erp" | "local" {
  return sale.erpOnly ||
    sale.erpSynced
    ? "erp"
    : "local";
}

export function visibleSales(
  db: DB,
): Sale[] {
  const erp =
    db.erpSales ?? [];

  const erpIds =
    new Set(
      erp.map(
        (sale) => sale.id,
      ),
    );

  const localUnsynced =
    db.sales.filter(
      (sale) =>
        !sale.erpOnly &&
        !erpIds.has(
          sale.id,
        ),
    );

  return [
    ...localUnsynced,
    ...erp,
  ].sort(
    (a, b) =>
      a.dateISO <
      b.dateISO
        ? 1
        : -1,
  );
}

export function activeSales(
  db: DB,
): Sale[] {
  return visibleSales(
    db,
  ).filter(
    (sale) =>
      sale.status ===
      "GUARDADA",
  );
}

function saleIsFromErp(
  sale: Sale,
  erpSales:
    | Sale[]
    | undefined,
) {
  if (
    sale.erpOnly ||
    sale.erpSynced
  ) {
    return true;
  }

  return (
    erpSales ?? []
  ).some(
    (remoteSale) =>
      remoteSale.id ===
      sale.id,
  );
}

export function addCustomer(
  data:
    Omit<
      Customer,
      "id"
    >,
): Customer {
  const customer:
    Customer = {
    ...data,
    id:
      `c_${Date.now()}`,
  };

  set({
    ...state,
    customers: [
      ...state.customers,
      customer,
    ],
  });

  return customer;
}

export function updateCustomer(
  id: string,
  patch:
    Partial<
      Omit<
        Customer,
        "id"
      >
    >,
) {
  set({
    ...state,
    customers:
      state.customers.map(
        (customer) =>
          customer.id === id
            ? {
                ...customer,
                ...patch,
              }
            : customer,
      ),
  });
}

export function setCustomerPrice(
  customerId: string,
  key: string,
  price:
    | number
    | null,
) {
  set({
    ...state,
    customers:
      state.customers.map(
        (customer) => {
          if (
            customer.id !==
            customerId
          ) {
            return customer;
          }

          const next = {
            ...(
              customer.customPrices ??
              {}
            ),
          };

          if (
            price &&
            price > 0
          ) {
            next[key] =
              price;
          } else {
            delete next[key];
          }

          return {
            ...customer,
            customPrices: next,
          };
        },
      ),
  });
}

const round2 = (
  number: number,
) =>
  Math.round(
    number * 100,
  ) / 100;

function applyStock(
  products: Product[],
  sale: Sale,
  sign: 1 | -1,
) {
  return products.map(
    (product) => {
      const units =
        sale.lines
          .filter(
            (line) =>
              line.productId ===
              product.id,
          )
          .reduce(
            (
              accumulator,
              line,
            ) =>
              accumulator +
              lineStockUnits(line),
            0,
          );

      if (!units) {
        return product;
      }

      return {
        ...product,
        stock:
          round2(
            product.stock +
              sign * units,
          ),
      };
    },
  );
}

function assertStockAvailable(
  sale:
    Pick<
      Sale,
      "lines"
    >,
) {
  if (
    !sale.lines.length
  ) {
    throw new StockError(
      "Agrega al menos un producto",
    );
  }

  if (
    sale.lines.some(
      (line) =>
        line.qty <= 0,
    )
  ) {
    throw new StockError(
      "Hay líneas con cantidad 0",
    );
  }

  const needed =
    new Map<
      string,
      number
    >();

  for (
    const line of sale.lines
  ) {
    needed.set(
      line.productId,
      (
        needed.get(
          line.productId,
        ) ?? 0
      ) +
        lineStockUnits(line),
    );
  }

  for (
    const [
      productId,
      units,
    ] of needed
  ) {
    const product =
      state.products.find(
        (candidate) =>
          candidate.id ===
          productId,
      );

    if (!product) {
      const name =
        sale.lines.find(
          (line) =>
            line.productId ===
            productId,
        )?.name ??
        productId;

      throw new StockError(
        `No hay stock registrado para ${name}`,
      );
    }

    if (
      units >
      product.stock
    ) {
      throw new StockError(
        `${product.name} supera el stock disponible (${stockLabel(product)})`,
      );
    }
  }
}

export function saveSale(
  sale:
    Omit<
      Sale,
      "id" |
      "dateISO" |
      "status"
    >,
): Sale {
  assertStockAvailable(
    sale,
  );

  const full:
    Sale = {
    ...sale,
    id:
      `V-${Date.now()
        .toString()
        .slice(-8)}`,
    dateISO:
      new Date()
        .toISOString(),
    status:
      "GUARDADA",
  };

  set({
    ...state,
    products:
      applyStock(
        state.products,
        full,
        -1,
      ),
    sales: [
      full,
      ...state.sales,
    ],
  });

  return full;
}

export function cancelSale(
  saleId: string,
) {
  const sale =
    state.sales.find(
      (candidate) =>
        candidate.id ===
        saleId,
    );

  if (
    !sale ||
    sale.status ===
      "ANULADA"
  ) {
    return;
  }

  if (
    saleIsFromErp(
      sale,
      state.erpSales,
    )
  ) {
    return;
  }

  set({
    ...state,
    products:
      applyStock(
        state.products,
        sale,
        1,
      ),
    sales:
      state.sales.map(
        (candidate) =>
          candidate.id ===
          saleId
            ? {
                ...candidate,
                status:
                  "ANULADA",
              }
            : candidate,
      ),
  });
}

export function resetDB() {
  state = seedDB();
  persist();
  emit();
}

export function getLocalStorageNamespace() {
  return getStorageKey();
}