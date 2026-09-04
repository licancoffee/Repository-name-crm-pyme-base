import type {
  Customer,
  Product,
  ProductFormat,
  Sale,
} from "../types";

import {
  resolveOperationalConnection,
} from "@/lib/setup/operational-connection.server";

type BackendInventory = {
  codigo?: string;
  producto?: string;
  unidadControl?: string;
  stockFisico?: number;
  stockMinimo?: number;
  equivalenteKg?: number;
};

type BackendProduct = {
  codigo?: string;
  nombre?: string;
  categoria?: string;
  unidadStock?: string;
  kgPorUnidad?: number;
  costoNeto?: number;
  stockMinimo?: number;
  formatoDefault?: string;
  precioDefault?: number;
  formats?: Array<{
    label?: string;
    units?: number;
    price?: number;
    prefPrice?: number;
  }>;
};

type BackendCustomer = {
  id?: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
  tipoPrecio?: string;
  tipoCliente?: string;
  observacion?: string;
};

type BackendSaleItem = {
  codigo?: string;
  producto?: string;
  formato?: string;
  cantidad?: number;
  unidades?: number;
  precioUnitario?: number;
  costoUnitario?: number;
  costoTotal?: number;
};

type BackendSale = {
  ventaId?: string;
  fecha?: string;
  cliente?: string;
  telefono?: string;
  formaPago?: string;
  observacion?: string;
  estado?: string;
  total?: number;
  items?: BackendSaleItem[];
};

type BackendBootstrap = {
  ok?: boolean;
  error?: string;
  clientId?: string;
  productos?: BackendProduct[];
  clientes?: BackendCustomer[];
  inventario?: BackendInventory[];
  ventas?: BackendSale[];
};

function key(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function paymentMethod(value: unknown): Sale["payment"] {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "transferencia") return "transferencia";
  if (normalized === "debito") return "debito";
  if (normalized === "credito") return "credito";
  if (normalized === "pendiente") return "pendiente";
  return "efectivo";
}

function priceType(value: unknown): Customer["priceType"] {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "PREFERENTE") return "PREFERENTE";
  if (normalized === "PERSONALIZADO") return "PERSONALIZADO";
  return "LISTA";
}

export async function readOperationalSnapshot(
  requestedClientId?: string,
) {
  const connection =
    await resolveOperationalConnection(
      requestedClientId,
    );

  console.log(
    "[ERP] Conexión resuelta:",
    connection ? connection.source : "NO",
  );

  if (!connection) {
    throw new Error(
      "No existe una conexión operativa configurada para este CLIENT_ID.",
    );
  }

  const apiUrl =
    new URL(connection.url);
  apiUrl.searchParams.set(
    "action",
    "bootstrap",
  );
  apiUrl.searchParams.set(
    "clientId",
    connection.clientId,
  );

  if (connection.legacyToken) {
    apiUrl.searchParams.set(
      "token",
      connection.legacyToken,
    );
  }

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Error al conectar con ERP (${response.status}).`);
  }

  const data = await response.json() as BackendBootstrap;

  if (!data?.ok) {
    throw new Error(data?.error || "El ERP respondió con error.");
  }

  if (
    data.clientId &&
    connection.clientId &&
    data.clientId !== connection.clientId
  ) {
    throw new Error(
      "El backend operativo respondió con otro CLIENT_ID.",
    );
  }

  const inventoryByCode = new Map<string, BackendInventory>();

  for (const item of data.inventario ?? []) {
    const codeKey = key(item.codigo);
    if (codeKey) inventoryByCode.set(codeKey, item);
  }

  const products: Product[] = (data.productos ?? [])
    .map((raw): Product | null => {
      const id = String(raw.codigo ?? "").trim();
      if (!id) return null;

      const inventory = inventoryByCode.get(key(id));
      const configuredFormats = Array.isArray(raw.formats)
        ? raw.formats
        : [];

      const formats: ProductFormat[] = configuredFormats
        .map((format): ProductFormat | null => {
          const label = String(format.label ?? "").trim();
          if (!label) return null;

          const price = Number(format.price ?? raw.precioDefault ?? 0);

          return {
            label,
            units: Math.max(1, Number(format.units ?? 1)),
            price,
            prefPrice: Number(format.prefPrice ?? price),
          };
        })
        .filter((format): format is ProductFormat => Boolean(format));

      if (!formats.length) {
        const label = String(raw.formatoDefault ?? "Unidad").trim() || "Unidad";
        const price = Number(raw.precioDefault ?? 0);

        formats.push({
          label,
          units: 1,
          price,
          prefPrice: price,
        });
      }

      const stock = Number(inventory?.stockFisico ?? 0);
      const equivalentKg = Number(inventory?.equivalenteKg ?? 0);
      const kgPerUnit =
        Number(raw.kgPorUnidad ?? 0) > 0
          ? Number(raw.kgPorUnidad)
          : stock > 0 && equivalentKg > 0
            ? equivalentKg / stock
            : undefined;

      return {
        id,
        name: String(raw.nombre ?? inventory?.producto ?? id),
        category: String(raw.categoria ?? ""),
        stockUnitLabel: String(
          inventory?.unidadControl ?? raw.unidadStock ?? "unidad",
        ),
        kgPerUnit,
        netCost: Number(raw.costoNeto ?? 0),
        stock,
        min: Number(raw.stockMinimo ?? inventory?.stockMinimo ?? 0),
        formats,
        format: String(raw.formatoDefault ?? formats[0]?.label ?? "Unidad"),
        price: Number(raw.precioDefault ?? formats[0]?.price ?? 0),
      };
    })
    .filter((product): product is Product => Boolean(product));

  const customers: Customer[] = (data.clientes ?? []).map(
    (raw, index) => ({
      id:
        String(raw.id ?? "").trim() ||
        String(raw.telefono ?? "").trim() ||
        `ERP-${index + 1}`,
      name: String(raw.nombre ?? "").trim(),
      phone: String(raw.telefono ?? "").trim(),
      address: String(raw.direccion ?? "").trim(),
      note: String(raw.observacion ?? "").trim(),
      priceType: priceType(raw.tipoPrecio ?? raw.tipoCliente),
      customPrices: {},
    }),
  );

  const productByCode = new Map(
    products.map((product) => [key(product.id), product]),
  );

  const sales: Sale[] = (data.ventas ?? []).map((raw) => {
    const items = Array.isArray(raw.items) ? raw.items : [];

    const lines = items.map((item) => {
      const itemCode = String(item.codigo ?? "").trim();
      const product = productByCode.get(key(itemCode));
      const saleFormat = String(item.formato ?? "").trim();
      const configuredFormat = product?.formats.find(
        (format) =>
          format.label.toLowerCase() === saleFormat.toLowerCase(),
      );

      const qty = Number(item.cantidad ?? 0);
      const price = Number(item.precioUnitario ?? configuredFormat?.price ?? 0);
      const formatUnits = Number(configuredFormat?.units ?? 1);

      const backendUnitCost = Number(item.costoUnitario ?? 0);
      const backendTotalCost = Number(item.costoTotal ?? 0);

      const netCost =
        backendUnitCost > 0
          ? backendUnitCost
          : backendTotalCost > 0 && qty > 0
            ? backendTotalCost / qty
            : Number(product?.netCost ?? 0) * formatUnits;

      return {
        productId: product?.id ?? itemCode,
        name: String(item.producto ?? product?.name ?? itemCode),
        format: saleFormat || configuredFormat?.label || "Unidad",
        formatUnits,
        price,
        netCost,
        qty,
      };
    });

    const subtotal = lines.reduce(
      (sum, line) => sum + line.price * line.qty,
      0,
    );
    const total = Number(raw.total ?? subtotal);

    return {
      id: String(raw.ventaId ?? ""),
      dateISO: String(raw.fecha ?? new Date().toISOString()),
      customerId: null,
      customerName: String(raw.cliente ?? "Sin cliente"),
      customerPhone: String(raw.telefono ?? ""),
      priceType: null,
      lines,
      discountType: "monto",
      discountValue: 0,
      discountAmount: Math.max(0, subtotal - total),
      subtotal,
      total,
      payment: paymentMethod(raw.formaPago),
      note: String(raw.observacion ?? ""),
      status:
        String(raw.estado ?? "").toUpperCase() === "ANULADA"
          ? "ANULADA"
          : "GUARDADA",
      erpSynced: true,
      erpOnly: true,
    };
  });

  return {
    clientId:
      connection.clientId,
    products,
    customers,
    sales,
    fetchedAtISO: new Date().toISOString(),
  };
}
