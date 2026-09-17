import type {
  Customer,
  DB,
  Product,
} from "./types";

import {
  getActiveClientId,
  isDemoClientId,
} from "@/lib/config/active-client";

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

const demoProducts: Product[] = [
  {
    id: "demo-cafe-grano",
    name: "Café en grano premium",
    category: "Café",
    stockUnitLabel: "bolsa 1 kg",
    kgPerUnit: 1,
    netCost: 9800,
    stock: 24,
    min: 6,
    formats: [
      { label: "1 kg", units: 1, price: 18990, prefPrice: 17490 },
    ],
    format: "1 kg",
    price: 18990,
  },
  {
    id: "demo-chocolate",
    name: "Chocolate para máquina",
    category: "Insumos",
    stockUnitLabel: "bolsa 1 kg",
    kgPerUnit: 1,
    netCost: 6200,
    stock: 18,
    min: 5,
    formats: [
      { label: "1 kg", units: 1, price: 11990, prefPrice: 10990 },
    ],
    format: "1 kg",
    price: 11990,
  },
  {
    id: "demo-chai",
    name: "Té Chai",
    category: "Insumos",
    stockUnitLabel: "bolsa 1 kg",
    kgPerUnit: 1,
    netCost: 7100,
    stock: 4,
    min: 5,
    formats: [
      { label: "1 kg", units: 1, price: 13990, prefPrice: 12990 },
    ],
    format: "1 kg",
    price: 13990,
  },
  {
    id: "demo-vasos",
    name: "Vasos térmicos 12 oz",
    category: "Accesorios",
    stockUnitLabel: "paquete 50 unidades",
    netCost: 4200,
    stock: 12,
    min: 3,
    formats: [
      { label: "Pack 50", units: 1, price: 7990, prefPrice: 7490 },
    ],
    format: "Pack 50",
    price: 7990,
  },
];

const demoCustomers: Customer[] = [
  {
    id: "demo-cliente-1",
    name: "Hostería Calafquén",
    phone: "+56 9 5555 0101",
    address: "Lican Ray",
    note: "Cliente frecuente",
    priceType: "PREFERENTE",
  },
  {
    id: "demo-cliente-2",
    name: "Cabañas Bosque Sur",
    phone: "+56 9 5555 0102",
    address: "Villarrica",
    note: "Compra mensual",
    priceType: "LISTA",
  },
  {
    id: "demo-cliente-3",
    name: "Café Costanera",
    phone: "+56 9 5555 0103",
    address: "Pucón",
    note: "Retiro en local",
    priceType: "PREFERENTE",
  },
];

const demoSales = [
  {
    id: "DEMO-001",
    dateISO: "2026-09-15T15:30:00.000Z",
    customerId: "demo-cliente-1",
    customerName: "Hostería Calafquén",
    customerPhone: "+56 9 5555 0101",
    priceType: "PREFERENTE" as const,
    lines: [
      {
        productId: "demo-cafe-grano",
        name: "Café en grano premium",
        format: "1 kg",
        formatUnits: 1,
        price: 17490,
        netCost: 9800,
        qty: 2,
      },
    ],
    discountType: "monto" as const,
    discountValue: 0,
    discountAmount: 0,
    subtotal: 34980,
    total: 34980,
    payment: "transferencia" as const,
    note: "Venta de demostración",
    status: "GUARDADA" as const,
  },
  {
    id: "DEMO-002",
    dateISO: "2026-09-16T18:10:00.000Z",
    customerId: "demo-cliente-2",
    customerName: "Cabañas Bosque Sur",
    customerPhone: "+56 9 5555 0102",
    priceType: "LISTA" as const,
    lines: [
      {
        productId: "demo-chocolate",
        name: "Chocolate para máquina",
        format: "1 kg",
        formatUnits: 1,
        price: 11990,
        netCost: 6200,
        qty: 1,
      },
      {
        productId: "demo-vasos",
        name: "Vasos térmicos 12 oz",
        format: "Pack 50",
        formatUnits: 1,
        price: 7990,
        netCost: 4200,
        qty: 1,
      },
    ],
    discountType: "monto" as const,
    discountValue: 0,
    discountAmount: 0,
    subtotal: 19980,
    total: 19980,
    payment: "efectivo" as const,
    note: "Venta de demostración",
    status: "GUARDADA" as const,
  },
];

export const seedDB = (): DB =>
  isDemoClientId(getActiveClientId())
    ? {
        products: demoProducts.map((product) => ({
          ...product,
          formats: product.formats.map((format) => ({ ...format })),
        })),
        customers: demoCustomers.map((customer) => ({ ...customer })),
        sales: demoSales.map((sale) => ({
          ...sale,
          lines: sale.lines.map((line) => ({ ...line })),
        })),
      }
    : {
        products: [],
        customers: [],
        sales: [],
      };
