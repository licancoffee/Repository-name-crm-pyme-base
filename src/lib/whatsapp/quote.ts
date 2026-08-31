import {
  crearCotizacionEnAppsScript,
} from "../crm/cotizaciones/appsScript.server";

import type {
  CrearCotizacionResult,
} from "../crm/cotizaciones/payload";

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
 * FORMATO DE VENTA
 *********************************************************/

function getDefaultFormat(
  product: Product,
): ProductFormat {

  const format =
    product.formats[0];

  if (!format) {
    throw new Error(
      `${product.name} no tiene formato de venta configurado en el ERP.`,
    );
  }

  return format;
}

/*********************************************************
 * PRECIO BASE
 *********************************************************/

function getListPrice(
  format: ProductFormat,
): number {

  const price =
    Number(format.price);

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    throw new Error(
      `El formato ${format.label} no tiene un precio válido en el ERP.`,
    );
  }

  return price;
}

/*********************************************************
 * PRECIO PREFERENTE
 *
 * No se escriben precios manuales aquí.
 * Se utilizan price / prefPrice del ERP.
 *********************************************************/

function hasPreferredPrice(
  format: ProductFormat,
): boolean {

  const listPrice =
    Number(format.price);

  const preferredPrice =
    Number(format.prefPrice);

  return (
    Number.isFinite(listPrice) &&
    Number.isFinite(preferredPrice) &&
    listPrice > 0 &&
    preferredPrice > 0 &&
    preferredPrice < listPrice
  );
}

function getPreferredPrice(
  format: ProductFormat,
): number {

  if (
    !hasPreferredPrice(format)
  ) {
    return getListPrice(format);
  }

  return Number(
    format.prefPrice,
  );
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
    !session.email.includes("@")
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
   * CATÁLOGO REAL ERP
   *******************************************************/

  const products =
    await getWhatsAppCatalog();

  if (
    products.length === 0
  ) {
    throw new Error(
      "El ERP no devolvió productos.",
    );
  }

  /*******************************************************
   * RESOLVER PRODUCTOS
   *******************************************************/

  const resolved =
    session.products.map(
      (sessionProductName) => {

        const match =
          findProductInCatalog(
            sessionProductName,
            products,
          );

        if (!match) {
          throw new Error(
            `No encontré "${sessionProductName}" en el catálogo actual del ERP.`,
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
          !Number.isFinite(quantity) ||
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
         * quantity = cantidad comercial vendida
         * format.units = unidades físicas que descuenta
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
   * REGLA DE PRECIO POR VOLUMEN
   *
   * Si un producto tiene:
   *
   * prefPrice > 0
   * y
   * prefPrice < price
   *
   * el ERP está indicando que ese formato posee
   * precio preferente.
   *
   * La regla actual se activa desde 4 unidades
   * acumuladas de productos con precio preferente.
   *
   * Así evitamos nombres y precios hardcodeados.
   *******************************************************/

  const preferredEligibleQuantity =
    resolved
      .filter(
        ({ format }) =>
          hasPreferredPrice(
            format,
          ),
      )
      .reduce(
        (
          total,
          item,
        ) =>
          total +
          item.quantity,
        0,
      );

  const usePreferredPrice =
    preferredEligibleQuantity >= 4;

  /*******************************************************
   * ITEMS FINALES
   *******************************************************/

  const items =
    resolved.map(
      ({
        product,
        format,
        quantity,
      }) => {

        const precioUnitario =
          usePreferredPrice &&
          hasPreferredPrice(
            format,
          )
            ? getPreferredPrice(
                format,
              )
            : getListPrice(
                format,
              );

        return {
          sku:
            product.id,

          producto:
            product.name,

          formato:
            format.label,

          cantidad:
            quantity,

          precioUnitario,
        };
      },
    );

  /*******************************************************
   * CREAR COTIZACIÓN REAL
   *
   * Reutiliza el servicio del CRM.
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
