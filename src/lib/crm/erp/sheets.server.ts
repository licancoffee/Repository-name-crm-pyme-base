import type { Customer, Product, ProductFormat, Sale } from "../types";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

/**
 * ID de Google Sheets utilizado por la integración directa.
 * Debe configurarse por cliente en la variable de entorno ERP_SPREADSHEET_ID.
 */
export const ERP_SPREADSHEET_ID =
  process.env["ERP_SPREADSHEET_ID"] ?? "";

type Row = (string | number | null)[];

const str = (v: unknown) => (v == null ? "" : String(v)).trim();
const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const yes = (v: unknown) => str(v).toUpperCase().startsWith("SI");

/** Fecha serial de Google Sheets -> ISO. */
function serialToISO(v: unknown): string | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function headerIndex(header: Row) {
  const map = new Map<string, number>();
  header.forEach((h, i) => map.set(str(h).toUpperCase(), i));
  return (...names: string[]) => {
    for (const n of names) {
      const i = map.get(n.toUpperCase());
      if (i != null) return i;
    }
    return -1;
  };
}

async function batchGet(ranges: string[]): Promise<Record<string, Row[]>> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GOOGLE_SHEETS_API_KEY"];

  if (!ERP_SPREADSHEET_ID) {
    throw new Error("Falta configurar ERP_SPREADSHEET_ID.");
  }

  if (!lovableKey || !connKey) {
    throw new Error("Faltan credenciales de Google Sheets.");
  }

  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `${GATEWAY}/spreadsheets/${ERP_SPREADSHEET_ID}/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Google Sheets read failed [${res.status}]: ${body}`);
    throw new Error(`No se pudo leer Google Sheets [${res.status}]`);
  }
  const json = (await res.json()) as {
    valueRanges?: { range?: string; values?: Row[] }[];
  };
  const out: Record<string, Row[]> = {};
  (json.valueRanges ?? []).forEach((vr, i) => {
    const sheet = (ranges[i] ?? vr.range ?? "").split("!")[0]!.replace(/^'|'$/g, "");
    out[sheet] = vr.values ?? [];
  });
  return out;
}

type InvRow = { unit: string; physical: number; kg: number };

function parseInventory(rows: Row[]): Map<string, InvRow> {
  const map = new Map<string, InvRow>();
  if (!rows.length) return map;
  const at = headerIndex(rows[0]!);
  const iCode = at("CÓDIGO", "CODIGO");
  const iUnit = at("UNIDAD CONTROL");
  const iPhys = at("STOCK FÍSICO", "STOCK FISICO");
  const iKg = at("EQUIV. KG", "EQUIV KG");
  for (const r of rows.slice(1)) {
    const code = str(r[iCode]);
    if (!code) continue;
    map.set(code, {
      unit: str(r[iUnit]),
      physical: num(r[iPhys]),
      kg: num(r[iKg]),
    });
  }
  return map;
}

function buildFormats(
  masterFormat: string,
  unitLabel: string,
  price: number,
  prefPrice: number,
): { formats: ProductFormat[]; costDivider: number; defaultFormat: string } {
  const isHalfKgBag = /500\s*g/i.test(unitLabel);
  if (isHalfKgBag && /1\s*kg/i.test(masterFormat)) {
    // Stock en bolsas de 500 g; se vende en 500 g (1 bolsa) o 1 kg (2 bolsas).
    return {
      formats: [
        {
          label: "500 g",
          units: 1,
          price: Math.round(price / 2),
          prefPrice: Math.round(prefPrice / 2),
        },
        { label: "1 kg", units: 2, price, prefPrice },
      ],
      costDivider: 2,
      defaultFormat: "1 kg",
    };
  }
  const label = masterFormat || unitLabel || "Unidad";
  return {
    formats: [{ label, units: 1, price, prefPrice }],
    costDivider: 1,
    defaultFormat: label,
  };
}

function parseProducts(rows: Row[], inv: Map<string, InvRow>): Product[] {
  if (!rows.length) return [];
  const at = headerIndex(rows[0]!);
  const iCode = at("CÓDIGO", "CODIGO");
  const iName = at("PRODUCTO OFICIAL");
  const iCat = at("CATEGORÍA", "CATEGORIA");
  const iFmt = at("FORMATO");
  const iSell = at("VENDIBLE");
  const iCost = at("COSTO NETO");
  const iPrice = at("PRECIO VENTA IVA INCL.", "PRECIO VENTA IVA INCL");
  const iStock = at("STOCK ACTUAL");
  const iMin = at("STOCK MÍNIMO", "STOCK MINIMO");
  const iActive = at("ACTIVO CRM");

  const products: Product[] = [];
  for (const r of rows.slice(1)) {
    const code = str(r[iCode]);
    if (!code) continue;
    if (!yes(r[iSell]) || !yes(r[iActive])) continue;

    const name = str(r[iName]);
    const category = str(r[iCat]);
    const masterFormat = str(r[iFmt]);
    const price = num(r[iPrice]);
    // Por defecto, el precio preferente coincide con el precio lista.
    // Las reglas comerciales especiales se configuran fuera de esta capa.
    const prefPrice = price;

    const invRow = inv.get(code);
    const unitLabel = invRow?.unit || masterFormat;
    const { formats, costDivider, defaultFormat } = buildFormats(
      masterFormat,
      unitLabel,
      price,
      prefPrice,
    );

    const stock = invRow ? invRow.physical : num(r[iStock]);
    const kgPerUnit =
      invRow && invRow.physical > 0 && invRow.kg > 0 ? invRow.kg / invRow.physical : undefined;

    products.push({
      id: code,
      name,
      category,
      stockUnitLabel: (unitLabel || "unidad").toLowerCase(),
      kgPerUnit,
      netCost: Math.round(num(r[iCost]) / costDivider),
      stock,
      min: num(r[iMin]),
      formats,
      format: defaultFormat,
      price,
    });
  }
  return products;
}

const normalizeName = (n: string) =>
  n
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Clave normalizada para identificar clientes duplicados.
 */
function unifyKey(name: string) {
  return normalizeName(name);
}

function parseCustomers(rows: Row[]): Customer[] {
  if (!rows.length) return [];
  const at = headerIndex(rows[0]!);
  const iName = at("CLIENTE");
  const iPhone = at("TELEFONO", "TELÉFONO");
  const iAddr = at("DIRECCION", "DIRECCIÓN");
  const iCount = at("TOTAL COMPRAS");
  const iAmount = at("MONTO ACUMULADO");
  const iLast = at("FECHA ULTIMA COMPRA", "FECHA ÚLTIMA COMPRA");
  const iNote = at("OBSERVACION", "OBSERVACIÓN");
  const iType = at("TIPO CLIENTE");
  const iState = at("ESTADO");

  const byKey = new Map<string, Customer>();
  for (const r of rows.slice(1)) {
    const rawName = str(r[iName]).replace(/\s+/g, " ");
    if (!rawName) continue;
    const key = unifyKey(rawName);
    const notes = [str(r[iNote]), str(r[iType])].filter(Boolean).join(" · ");
    const incoming: Customer = {
      id: key,
      name: rawName,
      phone: str(r[iPhone]),
      address: str(r[iAddr]),
      note: notes,
      priceType: "LISTA",
      erpPurchaseCount: num(r[iCount]),
      erpTotalAmount: num(r[iAmount]),
      erpLastPurchaseISO: serialToISO(r[iLast]),
      erpStatus: str(r[iState]),
    };
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, incoming);
      continue;
    }
    // Ficha unificada: sumamos histórico y conservamos el dato más completo.
    byKey.set(key, {
      ...prev,
      phone: prev.phone || incoming.phone,
      address: prev.address || incoming.address,
      note: prev.note || incoming.note,
      erpPurchaseCount: (prev.erpPurchaseCount ?? 0) + (incoming.erpPurchaseCount ?? 0),
      erpTotalAmount: (prev.erpTotalAmount ?? 0) + (incoming.erpTotalAmount ?? 0),
      erpLastPurchaseISO:
        (prev.erpLastPurchaseISO ?? "") > (incoming.erpLastPurchaseISO ?? "")
          ? prev.erpLastPurchaseISO
          : incoming.erpLastPurchaseISO,
      erpStatus: prev.erpStatus || incoming.erpStatus,
    });
  }
  return [...byKey.values()];
}

/**
 * Ventas registradas en el ERP (hoja VENTAS).
 * ORIGEN se escribe desde el CRM como `CRM|<ventaId>|<MEDIO_PAGO>[|ANULADA]`,
 * lo que permite agrupar las filas de una misma venta y sincronizar el historial
 * entre celular y notebook.
 */
function parseSales(rows: Row[]): Sale[] {
  if (!rows.length) return [];
  const at = headerIndex(rows[0]!);
  const iDate = at("FECHA");
  const iProd = at("PRODUCTO");
  const iQty = at("CANTIDAD");
  const iTotal = at("TOTAL");
  const iClient = at("CLIENTE");
  const iPhone = at("TELEFONO", "TELÉFONO");
  const iOrigin = at("ORIGEN");
  const iCost = at("COSTO");

  const byId = new Map<string, Sale>();
  rows.slice(1).forEach((r, idx) => {
    const product = str(r[iProd]);
    if (!product) return;
    const origin = str(r[iOrigin]);
    const parts = origin.split("|").map((p) => p.trim());
    const isCrm = parts[0]?.toUpperCase() === "CRM" && !!parts[1];
    const dateISO = serialToISO(r[iDate]) ?? new Date().toISOString();
    const id = isCrm ? parts[1]! : `ERP-${idx + 2}`;
    const payment = (parts[2] ?? "").toLowerCase();
    const qty = num(r[iQty]) || 1;
    const total = num(r[iTotal]);
    const cost = num(r[iCost]);

    const line = {
      productId: product,
      name: product,
      format: "unidad",
      formatUnits: 1,
      price: qty > 0 ? Math.round(total / qty) : total,
      netCost: qty > 0 ? Math.round(cost / qty) : cost,
      qty,
    };

    const prev = byId.get(id);
    if (prev) {
      prev.lines.push(line);
      prev.subtotal += total;
      prev.total += total;
      return;
    }
    byId.set(id, {
      id,
      dateISO,
      customerId: null,
      customerName: str(r[iClient]) || "Sin cliente",
      customerPhone: str(r[iPhone]),
      priceType: null,
      lines: [line],
      discountType: "monto",
      discountValue: 0,
      discountAmount: 0,
      subtotal: total,
      total,
      payment: (["efectivo", "transferencia", "debito", "credito", "pendiente"].includes(payment)
        ? payment
        : "efectivo") as Sale["payment"],
      note: "",
      status: origin.toUpperCase().includes("ANULADA") ? "ANULADA" : "GUARDADA",
      erpSynced: true,
      erpOnly: true,
    });
  });

  return [...byId.values()].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

export type ErpSnapshot = {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  fetchedAtISO: string;
};

export async function readErpSnapshot(): Promise<ErpSnapshot> {
  const baseUrl = process.env["ERP_APPS_SCRIPT_URL"];
  const token = process.env["CRM_API_TOKEN"];
  
  console.log("[ERP] URL cargada:", baseUrl ? "SI" : "NO");
  console.log("[ERP] TOKEN cargado:", token ? "SI" : "NO");
  
  if (!baseUrl) {
    throw new Error("Falta configurar ERP_APPS_SCRIPT_URL.");
  }
  
  if (!token) {
    throw new Error("Falta configurar CRM_API_TOKEN.");
  }
  
  const apiUrl = new URL(baseUrl);
  apiUrl.searchParams.set("action", "bootstrap");
  apiUrl.searchParams.set("token", token);
  
  const url = apiUrl.toString();

  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });
  console.log("[ERP] HTTP status:", response.status);
console.log("[ERP] content-type:", response.headers.get("content-type"));
const debugText = await response.clone().text();
console.log("[ERP] respuesta:", debugText.slice(0, 300));
  if (!response.ok) {
    throw new Error(
      `Error al conectar con ERP (${response.status}).`,
    );
  }

  const data = await response.json();

  if (!data?.ok) {
    throw new Error(
      data?.error || "El ERP respondió con error.",
    );
  }

  const inventarioPorCodigo = new Map<
    string,
    {
      unidadControl?: string;
      stockFisico?: number;
      equivalenteKg?: number;
    }
  >();

  for (const inv of data.inventario ?? []) {
    const codigo = String(inv.codigo ?? "")
      .trim()
      .toUpperCase();

    if (!codigo) continue;

    inventarioPorCodigo.set(codigo, {
      unidadControl: String(inv.unidadControl ?? ""),
      stockFisico: Number(inv.stockFisico ?? 0),
      equivalenteKg: Number(inv.equivalenteKg ?? 0),
    });
  }

  const products: Product[] = (data.productos ?? []).map(
    (p: any) => {
      const codigo = String(p.codigo ?? "")
        .trim()
        .toUpperCase();

      const inv = inventarioPorCodigo.get(codigo);

      const formato = String(p.formato ?? "").trim();
      const precio = Number(p.precioVenta ?? 0);

      const stockUnitLabel =
        inv?.unidadControl || formato || "Unidad";

      const kgPerUnit =
        Number(inv?.equivalenteKg ?? 0) > 0 &&
        Number(inv?.stockFisico ?? 0) > 0
          ? Number(inv!.equivalenteKg) /
            Number(inv!.stockFisico)
          : undefined;

      const formats: ProductFormat[] = [
        {
          label: formato || "Unidad",
          units: 1,
          price: precio,
          prefPrice: precio,
        },
      ];

      /*
       * Si el inventario se controla físicamente en unidades de 500 g
       * y el formato comercial principal es 1 kg, habilitamos ambos
       * formatos sin depender de códigos de producto específicos.
       */
      const isHalfKgStock =
        /500\s*g/i.test(stockUnitLabel);

      const isOneKgFormat =
        /1\s*kg/i.test(formato);

      if (isHalfKgStock && isOneKgFormat) {
        formats.splice(
          0,
          formats.length,
          {
            label: "500 g",
            units: 1,
            price: Math.round(precio / 2),
            prefPrice: Math.round(precio / 2),
          },
          {
            label: "1 kg",
            units: 2,
            price: precio,
            prefPrice: precio,
          },
        );
      }
      

      return {
        id: codigo,
        name: String(p.nombre ?? ""),
        category: String(p.categoria ?? ""),
        stockUnitLabel,
        kgPerUnit,
        netCost: Number(p.costoNeto ?? 0),
        stock: Number(inv?.stockFisico ?? 0),
        min: Number(p.stockMinimo ?? 0),
        formats,
        format: formats[0]?.label || formato || "Unidad",
        price: formats[0]?.price ?? precio,
      };
    },
  );

  const customers: Customer[] = (data.clientes ?? []).map(
    (c: any, index: number) => {
      const phone = String(c.telefono ?? "").trim();
      const name = String(c.nombre ?? "").trim();

      return {
        id:
          phone ||
          `ERP-${index + 1}-${name
            .toUpperCase()
            .replace(/\s+/g, "-")}`,
        name,
        phone,
        address: String(c.direccion ?? ""),
        note: String(c.observacion ?? ""),
        priceType:
          c.tipoCliente === "PREFERENTE" ||
          c.tipoCliente === "PERSONALIZADO"
            ? c.tipoCliente
            : "LISTA",
        customPrices: {},
        erpPurchaseCount: Number(c.totalCompras ?? 0),
        erpTotalAmount: Number(c.montoAcumulado ?? 0),
        erpLastPurchaseISO:
          String(c.fechaUltimaCompra ?? "") || undefined,
        erpStatus: String(c.estado ?? "") || undefined,
      };
    },
  );

  const sales: Sale[] = (data.ventas ?? []).map(
    (s: any) => {
      const items = Array.isArray(s.items) ? s.items : [];

      const lines = items.map((item: any) => ({
        productId: String(item.codigo ?? ""),
        name: String(item.producto ?? ""),
        format: String(item.formato ?? ""),
        formatUnits: (() => {
          const productCode =
            String(item.codigo ?? "")
              .trim()
              .toUpperCase();

          const saleFormat =
            String(item.formato ?? "")
              .trim();

          const product =
            products.find(
              (candidate) =>
                candidate.id === productCode,
            );

          const configuredFormat =
            product?.formats.find(
              (format) =>
                format.label.toLowerCase() ===
                saleFormat.toLowerCase(),
            );

          return configuredFormat?.units ?? 1;
        })(),
        price: Number(item.precioUnitario ?? 0),
        netCost: Number(
          item.costoUnitario ??
            item.costoTotal ??
            0,
        ),
        qty: Number(item.cantidad ?? 0),
      }));

      const subtotal = lines.reduce(
        (sum: number, line: any) =>
          sum + line.price * line.qty,
        0,
      );

      const total = Number(s.total ?? subtotal);

      const paymentRaw = String(
        s.formaPago ?? "efectivo",
      ).toLowerCase();

      const payment =
        paymentRaw === "transferencia"
          ? "transferencia"
          : paymentRaw === "tarjeta"
            ? "tarjeta"
            : "efectivo";

      return {
        id: String(s.ventaId ?? ""),
        dateISO: String(s.fecha ?? new Date().toISOString()),
        customerId: null,
        customerName: String(s.cliente ?? "Sin cliente"),
        customerPhone: String(s.telefono ?? ""),
        priceType: null,
        lines,
        discountType: "monto",
        discountValue: 0,
        discountAmount: Math.max(0, subtotal - total),
        subtotal,
        total,
        payment,
        note: String(s.observacion ?? ""),
        status:
          String(s.estado ?? "").toUpperCase() === "ANULADA"
            ? "ANULADA"
            : "GUARDADA",
        erpSynced: true,
        erpOnly: true,
      };
    },
  );

  return {
    products,
    customers,
    sales,
    fetchedAtISO: new Date().toISOString(),
  };
}


