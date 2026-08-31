import {
  readErpSnapshot,
} from "../crm/erp/sheets.server";

import type {
  Product,
  ProductFormat,
} from "../crm/types";

/*********************************************************
 * TIPOS
 *********************************************************/

export type WhatsAppCatalogItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  stockUnitLabel: string;
  formats: ProductFormat[];
};

export type WhatsAppProductMatch = {
  product: Product;
  matchedBy:
    | "exact"
    | "alias"
    | "partial";
};

export type WhatsAppCategoryMatch = {
  label: string;
  products: Product[];
};

export type CoffeePresentation =
  | "grano"
  | "molido"
  | null;

/*********************************************************
 * NORMALIZACIÓN
 *********************************************************/

export function normalizeCatalogText(
  value: string,
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

/*********************************************************
 * ALIAS DE PRODUCTOS
 *
 * Importante:
 * NO usamos "café en grano" ni "café molido" como alias
 * de un producto individual porque existen varias
 * variedades y no debemos elegir una al azar.
 *********************************************************/

const aliases: Record<
  string,
  string[]
> = {
  "cappuccino tradicional": [
    "cappuccino tradicional",
    "capuccino tradicional",
    "cappucino tradicional",
  ],

  "cappuccino vainilla": [
    "cappuccino vainilla",
    "capuccino vainilla",
    "cappucino vainilla",
  ],

  "cappuccino avellana": [
    "cappuccino avellana",
    "capuccino avellana",
    "cappucino avellana",
  ],

  "cappuccino trufa": [
    "cappuccino trufa",
    "capuccino trufa",
    "cappucino trufa",
  ],

  mokaccino: [
    "mokaccino",
    "mokachino",
    "mocaccino",
    "mocachino",
  ],

  chocolate: [
    "chocolate",
  ],

  "te chai": [
    "te chai",
    "chai",
  ],

  "crema de leche": [
    "crema de leche",
    "crema leche",
    "crema sabor leche",
  ],
};

/*********************************************************
 * CATEGORÍAS
 *********************************************************/

const categoryQueries: Array<{
  label: string;
  phrases: string[];
  searchTerms: string[];
}> = [
  {
    label: "cafés",
    phrases: [
      "cafe",
      "cafes",
      "que cafe tienen",
      "que cafes tienen",
      "que cafe venden",
      "que cafes venden",
    ],
    searchTerms: [
      "cafe",
    ],
  },

  {
    label: "cappuccinos",
    phrases: [
      "cappuccino",
      "cappuccinos",
      "capuccino",
      "capuccinos",
      "que cappuccino tienen",
      "que cappuccinos tienen",
      "que capuccino tienen",
      "que capuccinos tienen",
    ],
    searchTerms: [
      "cappuccino",
      "capuccino",
      "cappucino",
    ],
  },

  {
    label: "mezclas",
    phrases: [
      "mezcla",
      "mezclas",
      "que mezclas tienen",
      "que mezclas venden",
    ],
    searchTerms: [
      "mezcla",
    ],
  },
];

/*********************************************************
 * CATÁLOGO
 *********************************************************/

export async function getWhatsAppCatalog():
Promise<Product[]> {
  const snapshot =
    await readErpSnapshot();

  return snapshot.products;
}

export async function getAvailableProducts():
Promise<Product[]> {
  const products =
    await getWhatsAppCatalog();

  return products.filter(
    (product) =>
      product.stock > 0,
  );
}

/*********************************************************
 * CAFÉ
 *********************************************************/

export function isCoffeeProduct(
  product: Product,
): boolean {
  const name =
    normalizeCatalogText(
      product.name,
    );

  const category =
    normalizeCatalogText(
      product.category || "",
    );

  return (
    name.includes("cafe") ||
    category.includes("cafe")
  );
}

export function isGroundCoffeeProduct(
  product: Product,
): boolean {
  if (!isCoffeeProduct(product)) {
    return false;
  }

  const name =
    normalizeCatalogText(
      product.name,
    );

  return name.includes(
    "molido",
  );
}

export function isWholeBeanCoffeeProduct(
  product: Product,
): boolean {
  if (!isCoffeeProduct(product)) {
    return false;
  }

  const name =
    normalizeCatalogText(
      product.name,
    );

  return (
    name.includes("grano") ||
    !name.includes("molido")
  );
}

/*********************************************************
 * PRESENTACIÓN PEDIDA
 *********************************************************/

export function detectCoffeePresentation(
  query: string,
): CoffeePresentation {
  const normalized =
    normalizeCatalogText(
      query,
    );

  if (
    normalized.includes(
      "molido",
    )
  ) {
    return "molido";
  }

  if (
    normalized.includes(
      "grano",
    ) ||
    normalized.includes(
      "en grano",
    )
  ) {
    return "grano";
  }

  return null;
}

/*********************************************************
 * VARIEDADES DE CAFÉ
 *********************************************************/

export async function findCoffeeOptions(
  presentation: CoffeePresentation = null,
): Promise<Product[]> {
  const products =
    await getWhatsAppCatalog();

  return products.filter(
    (product) => {
      if (
        !isCoffeeProduct(
          product,
        )
      ) {
        return false;
      }

      if (
        product.stock <= 0
      ) {
        return false;
      }

      if (
        presentation ===
        "molido"
      ) {
        return isGroundCoffeeProduct(
          product,
        );
      }

      if (
        presentation ===
        "grano"
      ) {
        return isWholeBeanCoffeeProduct(
          product,
        );
      }

      return true;
    },
  );
}

/*********************************************************
 * NOMBRE DE VARIEDAD
 *
 * Se usa solo para evitar duplicados visuales como:
 * Santa Rosa
 * Santa Rosa Grano
 * Santa Rosa Molido
 *********************************************************/

function cleanCoffeeVarietyName(
  value: string,
): string {
  return value
    .replace(
      /\bcaf[eé]\b/gi,
      "",
    )
    .replace(
      /\ben\s+grano\b/gi,
      "",
    )
    .replace(
      /\bgrano\b/gi,
      "",
    )
    .replace(
      /\bmolido\b/gi,
      "",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

/*********************************************************
 * LISTA DE VARIEDADES DE CAFÉ
 *********************************************************/

export function buildCoffeeOptionsReply(
  products: Product[],
  presentation: CoffeePresentation = null,
): string {
  if (
    products.length === 0
  ) {
    return buildExecutiveReply();
  }

  const names =
    products
      .map(
        (product) =>
          cleanCoffeeVarietyName(
            product.name,
          ),
      )
      .filter(
        (name) =>
          name.length > 0,
      );

  const uniqueNames =
    [...new Set(names)];

  if (
    uniqueNames.length === 0
  ) {
    return buildExecutiveReply();
  }

  let heading =
    "Claro 😊 Tenemos estas variedades de café:";

  if (
    presentation === "grano"
  ) {
    heading =
      "Claro 😊 Tenemos estas opciones de café en grano:";
  }

  if (
    presentation === "molido"
  ) {
    heading =
      "Claro 😊 Tenemos estas opciones de café molido:";
  }

  const lines: string[] = [
    heading,
    "",
  ];

  for (
    const name
    of uniqueNames
  ) {
    lines.push(
      `• ${name}`,
    );
  }

  lines.push(
    "",
    "Dime cuál te interesa y te indico los formatos y precios ☕",
  );

  return lines.join("\n");
}

/*********************************************************
 * BÚSQUEDA EXACTA
 *********************************************************/

function findExactProduct(
  query: string,
  products: Product[],
): Product | null {
  const normalizedQuery =
    normalizeCatalogText(
      query,
    );

  return (
    products.find(
      (product) =>
        normalizeCatalogText(
          product.name,
        ) ===
        normalizedQuery,
    ) ?? null
  );
}

/*********************************************************
 * BÚSQUEDA POR ALIAS
 *********************************************************/

function findAliasProduct(
  query: string,
  products: Product[],
): Product | null {
  const normalizedQuery =
    normalizeCatalogText(
      query,
    );

  for (
    const [
      canonicalAlias,
      aliasList,
    ]
    of Object.entries(
      aliases,
    )
  ) {
    const normalizedAliases =
      [
        canonicalAlias,
        ...aliasList,
      ].map(
        normalizeCatalogText,
      );

    const userMatchesAlias =
      normalizedAliases.some(
        (alias) =>
          normalizedQuery ===
            alias ||
          normalizedQuery.includes(
            alias,
          ),
      );

    if (
      !userMatchesAlias
    ) {
      continue;
    }

    const product =
      products.find(
        (erpProduct) => {
          const normalizedName =
            normalizeCatalogText(
              erpProduct.name,
            );

          return normalizedAliases.some(
            (alias) =>
              normalizedName ===
                alias ||
              normalizedName.includes(
                alias,
              ) ||
              alias.includes(
                normalizedName,
              ),
          );
        },
      );

    if (product) {
      return product;
    }
  }

  return null;
}

/*********************************************************
 * BÚSQUEDA PARCIAL
 *********************************************************/

function findPartialProduct(
  query: string,
  products: Product[],
): Product | null {
  const normalizedQuery =
    normalizeCatalogText(
      query,
    );

  if (
    normalizedQuery.length < 3
  ) {
    return null;
  }

  const orderedProducts =
    [...products].sort(
      (a, b) =>
        normalizeCatalogText(
          b.name,
        ).length -
        normalizeCatalogText(
          a.name,
        ).length,
    );

  return (
    orderedProducts.find(
      (product) => {
        const normalizedName =
          normalizeCatalogText(
            product.name,
          );

        return (
          normalizedQuery.includes(
            normalizedName,
          ) ||
          normalizedName.includes(
            normalizedQuery,
          )
        );
      },
    ) ?? null
  );
}

/*********************************************************
 * BUSCADOR GENERAL
 *********************************************************/

export function findProductInCatalog(
  query: string,
  products: Product[],
): WhatsAppProductMatch | null {
  const exact =
    findExactProduct(
      query,
      products,
    );

  if (exact) {
    return {
      product: exact,
      matchedBy: "exact",
    };
  }

  const alias =
    findAliasProduct(
      query,
      products,
    );

  if (alias) {
    return {
      product: alias,
      matchedBy: "alias",
    };
  }

  const partial =
    findPartialProduct(
      query,
      products,
    );

  if (partial) {
    return {
      product: partial,
      matchedBy: "partial",
    };
  }

  return null;
}

export async function findWhatsAppProduct(
  query: string,
): Promise<WhatsAppProductMatch | null> {
  const products =
    await getWhatsAppCatalog();

  return findProductInCatalog(
    query,
    products,
  );
}

/*********************************************************
 * DETECCIÓN DE CATEGORÍA
 *********************************************************/

function detectCategoryQuery(
  query: string,
): {
  label: string;
  searchTerms: string[];
} | null {
  const normalizedQuery =
    normalizeCatalogText(
      query,
    );

  for (
    const category
    of categoryQueries
  ) {
    const detected =
      category.phrases.some(
        (phrase) => {
          const normalizedPhrase =
            normalizeCatalogText(
              phrase,
            );

          return (
            normalizedQuery ===
              normalizedPhrase ||
            normalizedQuery.includes(
              normalizedPhrase,
            )
          );
        },
      );

    if (detected) {
      return {
        label:
          category.label,
        searchTerms:
          category.searchTerms,
      };
    }
  }

  return null;
}

/*********************************************************
 * PERTENENCIA A CATEGORÍA
 *********************************************************/

function productMatchesCategory(
  product: Product,
  searchTerms: string[],
): boolean {
  const normalizedCategory =
    normalizeCatalogText(
      product.category || "",
    );

  const normalizedName =
    normalizeCatalogText(
      product.name,
    );

  return searchTerms.some(
    (term) => {
      const normalizedTerm =
        normalizeCatalogText(
          term,
        );

      return (
        normalizedCategory.includes(
          normalizedTerm,
        ) ||
        normalizedName.includes(
          normalizedTerm,
        )
      );
    },
  );
}

/*********************************************************
 * BUSCAR CATEGORÍA
 *********************************************************/

export async function findWhatsAppCategory(
  query: string,
): Promise<WhatsAppCategoryMatch | null> {
  const category =
    detectCategoryQuery(
      query,
    );

  if (!category) {
    return null;
  }

  const products =
    await getWhatsAppCatalog();

  const matchingProducts =
    products
      .filter(
        (product) =>
          product.stock > 0,
      )
      .filter(
        (product) =>
          productMatchesCategory(
            product,
            category.searchTerms,
          ),
      );

  return {
    label:
      category.label,
    products:
      matchingProducts,
  };
}

/*********************************************************
 * RESPUESTA DE CATEGORÍA
 *********************************************************/

export function buildCategoryReply(
  match: WhatsAppCategoryMatch,
): string {
  if (
    match.products.length === 0
  ) {
    return buildExecutiveReply();
  }

  const names =
    match.products
      .map(
        (product) =>
          product.name.trim(),
      )
      .filter(
        (name) =>
          name.length > 0,
      );

  const uniqueNames =
    [...new Set(names)];

  if (
    uniqueNames.length === 0
  ) {
    return buildExecutiveReply();
  }

  const lines: string[] = [
    `Claro 😊 Estas son nuestras opciones de ${match.label}:`,
    "",
  ];

  for (
    const name
    of uniqueNames
  ) {
    lines.push(
      `• ${name}`,
    );
  }

  lines.push(
    "",
    "Dime cuál te interesa y te indico el precio ☕",
  );

  return lines.join("\n");
}

/*********************************************************
 * FORMATO CLP
 *********************************************************/

export function formatCatalogClp(
  value: number,
): string {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

/*********************************************************
 * FORMATOS
 *********************************************************/

function isOneKgFormat(
  format: ProductFormat,
): boolean {
  const label =
    normalizeCatalogText(
      format.label,
    );

  return (
    label === "1 kg" ||
    label === "1kg" ||
    label === "1000 g" ||
    label === "1000g" ||
    label.includes(
      "1 kg",
    ) ||
    label.includes(
      "1000 g",
    )
  );
}

function is250gFormat(
  format: ProductFormat,
): boolean {
  const label =
    normalizeCatalogText(
      format.label,
    );

  return (
    label === "250 g" ||
    label === "250g" ||
    label.includes(
      "250 g",
    ) ||
    label.includes(
      "250g",
    )
  );
}

function validPrice(
  format: ProductFormat,
): boolean {
  return (
    Number.isFinite(
      format.price,
    ) &&
    format.price > 0
  );
}

export function getOneKgFormat(
  product: Product,
): ProductFormat | null {
  return (
    product.formats.find(
      isOneKgFormat,
    ) ?? null
  );
}

export function getPrimaryFormat(
  product: Product,
): ProductFormat | null {
  return (
    getOneKgFormat(
      product,
    ) ??
    product.formats[0] ??
    null
  );
}

export function getPrimaryPrice(
  product: Product,
): number | null {
  const format =
    getPrimaryFormat(
      product,
    );

  if (
    !format ||
    !validPrice(
      format,
    )
  ) {
    return null;
  }

  return format.price;
}

/*********************************************************
 * FORMATOS COMERCIALES DE CAFÉ
 *
 * Regla actual:
 *
 * 250 g → grano o molido.
 * 1 kg  → solo grano.
 *
 * Nunca ofrecemos 1 kg molido.
 *********************************************************/

export function getCoffeeCustomerFormats(
  product: Product,
): ProductFormat[] {
  if (
    !isCoffeeProduct(
      product,
    )
  ) {
    return [];
  }

  const ground =
    isGroundCoffeeProduct(
      product,
    );

  return product.formats
    .filter(
      validPrice,
    )
    .filter(
      (format) => {
        if (
          ground &&
          isOneKgFormat(
            format,
          )
        ) {
          return false;
        }

        if (
          is250gFormat(
            format,
          )
        ) {
          return true;
        }

        if (
          isOneKgFormat(
            format,
          )
        ) {
          return !ground;
        }

        return false;
      },
    );
}

/*********************************************************
 * DERIVACIÓN
 *********************************************************/

export function buildExecutiveReply():
string {
  return (
    "Claro 😊 Esa consulta requiere una atención más personalizada. Un ejecutivo de Lican Coffee te responderá por este mismo WhatsApp."
  );
}

/*********************************************************
 * PRECIO CAFÉ
 *********************************************************/

function buildCoffeePriceReply(
  product: Product,
  includeStock: boolean,
): string {
  if (
    product.stock <= 0
  ) {
    return buildExecutiveReply();
  }

  const formats =
    getCoffeeCustomerFormats(
      product,
    );

  if (
    formats.length === 0
  ) {
    return buildExecutiveReply();
  }

  const lines: string[] = [
    `☕ ${product.name}`,
  ];

  for (
    const format
    of formats
  ) {
    lines.push(
      `${format.label}: ${formatCatalogClp(
        format.price,
      )}`,
    );
  }

  if (includeStock) {
    lines.push(
      "Sí, tenemos stock disponible 😊",
    );
  }

  return lines.join("\n");
}

/*********************************************************
 * SOLO PRECIO
 *********************************************************/

export function buildProductPriceReply(
  product: Product,
): string {
  if (
    isCoffeeProduct(
      product,
    )
  ) {
    return buildCoffeePriceReply(
      product,
      false,
    );
  }

  const oneKg =
    getOneKgFormat(
      product,
    );

  if (
    !oneKg ||
    !validPrice(
      oneKg,
    )
  ) {
    return buildExecutiveReply();
  }

  return (
    `☕ ${product.name}\n` +
    `1 kg: ${formatCatalogClp(
      oneKg.price,
    )}`
  );
}

/*********************************************************
 * SOLO DISPONIBILIDAD
 *********************************************************/

export function buildProductStockReply(
  product: Product,
): string {
  if (
    product.stock <= 0
  ) {
    return buildExecutiveReply();
  }

  return (
    `☕ ${product.name}\n` +
    "Sí, tenemos stock disponible 😊"
  );
}

/*********************************************************
 * PRECIO + DISPONIBILIDAD
 *********************************************************/

export function buildProductPriceAndStockReply(
  product: Product,
): string {
  if (
    isCoffeeProduct(
      product,
    )
  ) {
    return buildCoffeePriceReply(
      product,
      true,
    );
  }

  if (
    product.stock <= 0
  ) {
    return buildExecutiveReply();
  }

  const oneKg =
    getOneKgFormat(
      product,
    );

  if (
    !oneKg ||
    !validPrice(
      oneKg,
    )
  ) {
    return buildExecutiveReply();
  }

  return (
    `☕ ${product.name}\n` +
    `1 kg: ${formatCatalogClp(
      oneKg.price,
    )}\n` +
    "Sí, tenemos stock disponible 😊"
  );
}

export function buildProductInfo(
  product: Product,
): string {
  return buildProductPriceAndStockReply(
    product,
  );
}

/*********************************************************
 * CATÁLOGO GENERAL
 *********************************************************/

export async function buildCatalogReply():
Promise<string> {
  const products =
    await getAvailableProducts();

  if (
    products.length === 0
  ) {
    return buildExecutiveReply();
  }

  return (
    "Claro 😊 En Lican Coffee tenemos café en grano y molido, cappuccinos y mezclas, chocolate, té chai, crema de leche y otros productos para cafetería.\n\n" +
    "Dime qué producto o categoría te interesa y te ayudo con las opciones disponibles ☕"
  );
}
