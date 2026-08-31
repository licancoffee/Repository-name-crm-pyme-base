import type { Customer, DB, Product, ProductFormat } from "./types";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Producto simple: una unidad física = un formato de venta. */
const simple = (
  name: string,
  category: string,
  format: string,
  netCost: number,
  price: number,
  stock: number,
  min: number,
  opts: { stockUnitLabel?: string; kgPerUnit?: number; prefPrice?: number } = {},
): Product => ({
  id: slug(name),
  name,
  category,
  stockUnitLabel: opts.stockUnitLabel ?? format,
  kgPerUnit: opts.kgPerUnit,
  netCost,
  stock,
  min,
  format,
  price,
  formats: [{ label: format, units: 1, price, prefPrice: opts.prefPrice ?? price }],
});

/**
 * Producto controlado en bolsas físicas de 500 g, vendible en 500 g o 1 kg.
 * `pricePerKg` es el precio lista de 1 kg; 500 g es la mitad.
 * `netCostPerKg` es el costo neto por kilo (se divide por bolsa).
 */
const dual500 = (
  name: string,
  category: string,
  netCostPerKg: number,
  pricePerKg: number,
  prefPricePerKg: number,
  bags: number,
  min: number,
): Product => {
  const formats: ProductFormat[] = [
    {
      label: "500 g",
      units: 1,
      price: Math.round(pricePerKg / 2),
      prefPrice: Math.round(prefPricePerKg / 2),
    },
    { label: "1 kg", units: 2, price: pricePerKg, prefPrice: prefPricePerKg },
  ];
  return {
    id: slug(name),
    name,
    category,
    stockUnitLabel: "bolsa 500 g",
    kgPerUnit: 0.5,
    netCost: Math.round(netCostPerKg / 2),
    stock: bags,
    min,
    format: "1 kg",
    price: pricePerKg,
    formats,
  };
};

export const seedProducts: Product[] = [
  // Mezclas con control en bolsas de 500 g
  dual500("Chocolate", "Mezclas", 3706, 11900, 11900, 49, 6),
  dual500("Té Chai", "Mezclas", 3756, 13500, 12900, 18, 6),
  dual500("Crema Sabor Leche", "Mezclas", 3706, 11900, 11900, 39, 6),
  // Resto de mezclas (1 kg)
  simple("Cappuccino Tradicional", "Mezclas", "1 kg", 4874, 13500, 16, 3, { prefPrice: 12900 }),
  simple("Cappuccino Vainilla", "Mezclas", "1 kg", 4748, 13500, 9, 3, { prefPrice: 12900 }),
  simple("Mokachino", "Mezclas", "1 kg", 4555, 13500, 10, 3, { prefPrice: 12900 }),
  simple("Cappuccino Avellana", "Mezclas", "1 kg", 5500, 13500, 20, 3, { prefPrice: 12900 }),
  simple("Cappuccino Trufa", "Mezclas", "1 kg", 5500, 13500, 10, 3, { prefPrice: 12900 }),
  // Café soluble
  simple("Cruzeiro Clásico Instantáneo", "Café soluble", "500 g", 7065, 14900, 19, 6, {
    stockUnitLabel: "unidad 500 g",
    kgPerUnit: 0.5,
  }),
  // Café grano / molido
  simple("Patagonia Intenso", "Café grano/molido", "1 kg", 18044, 34990, 1, 1, { kgPerUnit: 1 }),
  simple("Patagonia Intenso Grano", "Café grano", "250 g", 6129, 11990, 2, 1, { kgPerUnit: 0.25 }),
  simple("Patagonia Intenso Molido", "Café molido", "250 g", 6129, 11990, 0, 1, { kgPerUnit: 0.25 }),
  simple("Santa Rosa", "Café grano/molido", "1 kg", 17746, 34990, 1, 1, { kgPerUnit: 1 }),
  simple("Santa Rosa Grano", "Café grano", "250 g", 5783, 10990, 2, 1, { kgPerUnit: 0.25 }),
  simple("Santa Rosa Molido", "Café molido", "250 g", 5783, 10990, 2, 1, { kgPerUnit: 0.25 }),
  simple("Manizales Grano", "Café grano", "250 g", 5037, 10990, 2, 1, { kgPerUnit: 0.25 }),
  simple("Manizales Molido", "Café molido", "250 g", 5037, 10990, 1, 1, { kgPerUnit: 0.25 }),
  simple("Los Andes Grano", "Café grano", "250 g", 4444, 11990, 2, 1, { kgPerUnit: 0.25 }),
  simple("Los Andes Molido", "Café molido", "250 g", 4444, 11990, 0, 1, { kgPerUnit: 0.25 }),
  // Insumos
  simple("Revolvedores", "Insumos", "Caja 1.000 unidades", 3000, 5490, 10, 2, {
    stockUnitLabel: "caja",
  }),
];

const c = (
  name: string,
  phone = "",
  address = "",
  note = "",
  priceType: Customer["priceType"] = "LISTA",
): Customer => ({ id: slug(name), name, phone, address, note, priceType });

export const seedCustomers: Customer[] = [
  c("Daniela Le Petit"),
  c("Papá de Oscar Roberto"),
  c("Jorge Azúa Carrasco"),
  c("María José — Espacio Blue", "920376351", "Vicente Reyes 794, Villarrica"),
  c("Alejandra Cruz"),
  c(
    "Wilson Terán Castellanos / Panadería Wilson Terán",
    "",
    "",
    "Ficha unificada: Wilson Terán Castellanos y Panadería Wilson Terán Castellanos E.I.R.L.",
  ),
  c("María Fernanda Niño Garrido Ventas E.I.R.L."),
  c("Mix de Aventuras SpA"),
  c("Rocío Madelein Salazar Salazar"),
];

export const seedDB = (): DB => ({
  products: seedProducts.map((x) => ({ ...x, formats: x.formats.map((f) => ({ ...f })) })),
  customers: seedCustomers.map((x) => ({ ...x })),
  sales: [],
});
