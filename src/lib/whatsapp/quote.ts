import {
  crearCotizacionEnAppsScript,
} from "../crm/cotizaciones/appsScript.server";

import type {
  CrearCotizacionResult,
} from "../crm/cotizaciones/payload";

import {
  commercialConfig,
} from "../config/commercial";

import type {
  Product,
  ProductFormat,
} from "../crm/types";

import type {
  WhatsAppSession,
} from "./session";

import {
  findProductInCatalog,
  getWhatsAppCatalog,
} from "./catalog";

/*********************************************************
 * RESULTADO
 *********************************************************/

export type WhatsAppQuoteResult =
  CrearCotizacionResult & {
    items?: {
      sku: string;
      producto: string;
      formato: string;
      cantidad: number;
      precioUnitario: number;
    }[];
  };

/*********************************************************
 * NORMALIZACIÓN
 *********************************************************/

function normalizeText(
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
 * FORMATO DE VENTA
 *********************************************************/

function getDefaultFormat(
  product: Product,
): ProductFormat {
  const format =
    product.formats[0];

  if (!format) {
    throw new Error(
      `${product.name} no tiene un formato de venta configurado.`,
    );
  }

  return format;
}

/*********************************************************
 * PRECIO LISTA
 *********************************************************/

function getListPrice(
  format: ProductFormat,
): number {
  const price =
    Number(
      format.price,
    );

  if (
    !Number.isFinite(
      price,
    ) ||
    price <= 0
  ) {
    throw new Error(
      `El formato ${format.label} no tiene un precio válido.`,
    );
  }

  return price;
}

/*********************************************************
 * REGLAS COMERCIALES
 *********************************************************/

type ResolvedQuoteItem = {
  product: Product;
  format: ProductFormat;
  quantity: number;
};

function getConfiguredPrice(
  item: ResolvedQuoteItem,
  allItems: ResolvedQuoteItem[],
): number {
  const listPrice =
    getListPrice(
      item.format,
    );

  if (
    commercialConfig
      .volumePricingRules
      .length === 0
  ) {
    return listPrice;
  }

  const normalizedProductName =
    normalizeText(
      item.product.name,
    );

  for (
    const rule
    of commercialConfig
      .volumePricingRules
  ) {
    if (!rule.enabled) {
      continue;
    }

    const normalizedRuleProducts =
      rule.productNames.map(
        normalizeText,
      );

    const appliesToProduct =
      normalizedRuleProducts.includes(
        normalizedProductName,
      );

    if (
      !appliesToProduct
    ) {
      continue;
    }

    const combinedQuantity =
      allItems
        .filter(
          (candidate) =>
            normalizedRuleProducts.includes(
              normalizeText(
                candidate.product.name,
              ),
            ),
        )
        .reduce(
          (
            total,
            candidate,
          ) =>
            total +
            candidate.quantity,
          0,
        );

    if (
      combinedQuantity >=
      rule.minimumCombinedQuantity
    ) {
      const configuredVolumePrice =
        Number(
          rule.volumePrice,
        );

      if (
        Number.isFinite(
          configuredVolumePrice,
        ) &&
        configuredVolumePrice > 0
      ) {
        return configuredVolumePrice;
      }
    }

    const configuredNormalPrice =
      Number(
        rule.normalPrice,
      );

    if (
      Number.isFinite(
        configuredNormalPrice,
      ) &&
      configuredNormalPrice > 0
    ) {
      return configuredNormalPrice;
    }

    return listPrice;
  }

  return listPrice;
}

/*********************************************************
 * CREAR COTIZACIÓN DESDE WHATSAPP
 *********************************************************/

export async function createWhatsAppQuote(
  session: WhatsAppSession,
): Promise<WhatsAppQuoteResult> {
  /*******************************************************
   * VALIDACIONES DE SESIÓN
   *******************************************************/

  if (
    !session.customerName.trim()
  ) {
    throw new Error(
      "Falta el nombre del cliente.",
    );
  }

  if (
    !session.email.trim() ||
    !session.email.includes(
      "@",
    )
  ) {
    throw new Error(
      "Falta un correo electrónico válido.",
    );
  }

  if (
    session.products.length === 0
  ) {
    throw new Error(
      "La cotización no tiene productos.",
    );
  }

  /*******************************************************
   * CATÁLOGO
   *******************************************************/

  const products =
    await getWhatsAppCatalog();

  if (
    products.length === 0
  ) {
    throw new Error(
      "El catálogo no devolvió productos disponibles.",
    );
  }

  /*******************************************************
   * RESOLVER PRODUCTOS
   *******************************************************/

  const resolved:
    ResolvedQuoteItem[] =
    session.products.map(
      (
        sessionProductName,
      ) => {
        const match =
          findProductInCatalog(
            sessionProductName,
            products,
          );

        if (!match) {
          throw new Error(
            `No encontré "${sessionProductName}" en el catálogo actual.`,
          );
        }

        const product =
          match.product;

        const quantity =
          Number(
            session.quantities[
              sessionProductName
            ] ?? 0,
          );

        if (
          !Number.isFinite(
            quantity,
          ) ||
          quantity <= 0
        ) {
          throw new Error(
            `La cantidad de ${product.name} no es válida.`,
          );
        }

        const format =
          getDefaultFormat(
            product,
          );

        /*************************************************
         * STOCK
         *
         * quantity:
         * cantidad comercial solicitada.
         *
         * format.units:
         * unidades físicas descontadas por cada unidad
         * comercial.
         *************************************************/

        const requiredStock =
          quantity *
          format.units;

        if (
          requiredStock >
          product.stock
        ) {
          throw new Error(
            `Stock insuficiente de ${product.name}. Disponible: ${product.stock} ${product.stockUnitLabel}.`,
          );
        }

        return {
          product,
          format,
          quantity,
        };
      },
    );

  /*******************************************************
   * ITEMS FINALES
   *******************************************************/

  const items =
    resolved.map(
      (
        item,
      ) => {
        const precioUnitario =
          getConfiguredPrice(
            item,
            resolved,
          );

        return {
          sku:
            item.product.id,

          producto:
            item.product.name,

          formato:
            item.format.label,

          cantidad:
            item.quantity,

          precioUnitario,
        };
      },
    );

  /*******************************************************
   * CREAR COTIZACIÓN
   *******************************************************/

  const result =
    await crearCotizacionEnAppsScript({
      action:
        "crearCotizacion",

      cliente: {
        nombre:
          session.customerName.trim(),

        email:
          session.email
            .trim()
            .toLowerCase(),

        telefono:
          session.phone,

        localidad:
          session.location.trim() ||
          undefined,
      },

      items,

      observaciones:
        "Cotización solicitada por WhatsApp.",
    });

  return {
    ...result,
    items,
  };
}
