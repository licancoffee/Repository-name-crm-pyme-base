import {
  buildSessionSummary,
  getWhatsAppSession,
  resetWhatsAppSession,
  setSessionAction,
  setSessionCustomerName,
  setSessionEmail,
  setSessionLocation,
  setSessionProducts,
  setSessionQuantities,
  setSessionWaitingAction,
  setSessionWaitingEmail,
  sessionIsComplete,
  type WhatsAppSession,
} from "./session";

import {
  createWhatsAppQuote,
} from "./quote";

import {
  buildCatalogReply,
  buildCategoryReply,
  buildCoffeeOptionsReply,
  buildExecutiveReply,
  buildProductPriceAndStockReply,
  buildProductPriceReply,
  buildProductStockReply,
  detectCoffeePresentation,
  findCoffeeOptions,
  findWhatsAppCategory,
  findWhatsAppProduct,
  normalizeCatalogText,
} from "./catalog";

export type ConversationResult = {
  handled: boolean;
  reply?: string;
};

/*********************************************************
 * TEXTO
 *********************************************************/

function normalizeText(
  text: string,
): string {
  return normalizeCatalogText(
    text,
  );
}

function formatClp(
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
 * CIERRE / CANCELACIÓN
 *********************************************************/

function isConversationExit(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "adios",
    "chao",
    "chau",
    "hasta luego",
    "nos vemos",
    "gracias",
    "muchas gracias",
    "ok gracias",
    "perfecto gracias",
    "cancelar",
    "cancela",
    "anular",
    "olvidalo",
    "salir",
  ].includes(normalized);
}

function isCancellation(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "cancelar",
    "cancela",
    "anular",
    "olvidalo",
    "salir",
    "no",
  ].includes(normalized);
}

/*********************************************************
 * CONFIRMACIÓN
 *********************************************************/

function isConfirmation(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "si",
    "correcto",
    "confirmo",
    "confirmado",
    "esta bien",
    "ok",
    "dale",
    "perfecto",
  ].includes(normalized);
}

/*********************************************************
 * EMAIL
 *********************************************************/

function isValidEmail(
  text: string,
): boolean {
  const email =
    text
      .trim()
      .toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

/*********************************************************
 * INTENCIÓN DE COMPRA
 *********************************************************/

function hasPurchaseIntent(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "quiero",
    "necesito",
    "quisiera",
    "comprar",
    "compra",
    "pedido",
    "pedir",
    "cotizar",
    "cotizacion",
    "cotizame",
    "presupuesto",
    "me interesa",
    "dame",
    "deme",
  ].some(
    (word) =>
      normalized.includes(
        word,
      ),
  );
}

/*********************************************************
 * CATÁLOGO GENERAL
 *********************************************************/

function isCatalogQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "que productos tienen",
    "que productos venden",
    "productos",
    "catalogo",
    "que tienen",
    "que venden",
    "lista de productos",
    "ver productos",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/*********************************************************
 * CONSULTA DE CATEGORÍA
 *********************************************************/

function isCategoryBrowseQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  const exactCategories = [
    "cafe",
    "cafes",
    "cappuccino",
    "cappuccinos",
    "capuccino",
    "capuccinos",
    "mezcla",
    "mezclas",
  ];

  if (
    exactCategories.includes(
      normalized,
    )
  ) {
    return true;
  }

  return [
    "que cafes tienen",
    "que cafe tienen",
    "que cafes venden",
    "que cafe venden",
    "cuales cafes tienen",
    "cuales cafes venden",

    "que cappuccinos tienen",
    "que cappuccino tienen",
    "que capuccinos tienen",
    "que capuccino tienen",
    "cuales cappuccinos tienen",
    "cuales capuccinos tienen",

    "que mezclas tienen",
    "que mezclas venden",
    "cuales mezclas tienen",
    "cuales mezclas venden",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/*********************************************************
 * CONSULTA GENÉRICA DE CAFÉ
 *
 * Ejemplos:
 *
 * "¿Cuánto vale el café en grano?"
 * "¿Qué café en grano tienen?"
 * "¿Cuánto cuesta el café molido?"
 *
 * No elegimos una variedad arbitrariamente.
 *********************************************************/

function isGenericCoffeeQuestion(
  text: string,
): boolean {
  let normalized =
    normalizeText(text);

  if (
    !normalized.includes(
      "cafe",
    )
  ) {
    return false;
  }

  const removableWords = [
    "cuanto",
    "cuantos",
    "cuesta",
    "cuestan",
    "sale",
    "salen",
    "vale",
    "valen",
    "precio",
    "precios",
    "valor",
    "valores",
    "que",
    "cual",
    "cuales",
    "tienen",
    "venden",
    "hay",
    "disponible",
    "disponibles",
    "disponibilidad",
    "el",
    "la",
    "los",
    "las",
    "del",
  ];

  for (
    const word
    of removableWords
  ) {
    normalized =
      normalizeText(
        normalized.replace(
          new RegExp(
            `\\b${word}\\b`,
            "g",
          ),
          " ",
        ),
      );
  }

  return [
    "cafe",
    "cafes",
    "cafe grano",
    "cafe en grano",
    "cafes grano",
    "cafes en grano",
    "cafe molido",
    "cafes molidos",
  ].includes(normalized);
}

/*********************************************************
 * CAFÉ MOLIDO 1 KG
 *
 * Regla comercial actual:
 * 1 kg molido no se ofrece.
 *********************************************************/

function isOneKgGroundCoffeeQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  if (
    !normalized.includes(
      "cafe",
    ) ||
    !normalized.includes(
      "molido",
    )
  ) {
    return false;
  }

  return (
    normalized.includes(
      "1 kg",
    ) ||
    normalized.includes(
      "1kg",
    ) ||
    normalized.includes(
      "1 kilo",
    ) ||
    normalized.includes(
      "un kilo",
    ) ||
    normalized.includes(
      "1000 g",
    ) ||
    normalized.includes(
      "1000g",
    )
  );
}

/*********************************************************
 * PRECIO
 *********************************************************/

function isPriceQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "precio",
    "precios",
    "cuanto cuesta",
    "cuanto sale",
    "cuanto vale",
    "valor",
    "valores",
    "que valor tiene",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/*********************************************************
 * STOCK
 *********************************************************/

function isStockQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "stock",
    "disponible",
    "disponibilidad",
    "tienen",
    "hay",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/*********************************************************
 * STOCK EXACTO
 *********************************************************/

function isExactStockQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "cuanto stock",
    "cuanto queda",
    "cuanto tienen",
    "cuantas quedan",
    "cuantas tienen",
    "cantidad disponible",
    "cantidad de stock",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/*********************************************************
 * ENVÍOS GENERALES
 *********************************************************/

function isGeneralShippingQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "hacen envios",
    "hacen envio",
    "realizan envios",
    "realizan envio",
    "tienen envios",
    "tienen envio",
    "despachan",
    "hacen despachos",
    "envian",
    "envios",
    "despacho",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/*********************************************************
 * ENVÍOS ESPECÍFICOS
 *********************************************************/

function isSpecificShippingQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "cuanto cuesta el envio",
    "cuanto sale el envio",
    "valor del envio",
    "precio del envio",
    "costo del envio",
    "costo de despacho",
    "cuanto demora",
    "cuando llega",
    "despacho hoy",
    "envio hoy",
    "envio urgente",
    "despacho urgente",
    "a mi direccion",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

function buildShippingReply():
string {
  return (
    "Sí 😊 Realizamos envíos por Starken, Blue Express y Correos de Chile.\n\n" +
    "Indícame tu localidad o comuna y te orientamos con la opción de envío disponible."
  );
}

/*********************************************************
 * CONSULTAS PARA EJECUTIVO
 *********************************************************/

function isExecutiveQuestion(
  text: string,
): boolean {
  const normalized =
    normalizeText(text);

  return [
    "precio especial",
    "descuento especial",
    "mejor precio",
    "hacer descuento",
    "me puedes mejorar el precio",
    "condiciones comerciales",
    "pago a 30 dias",
    "credito",
    "convenio",
    "mezcla especial",
    "producto especial",
    "pedido especial",
  ].some(
    (phrase) =>
      normalized.includes(
        phrase,
      ),
  );
}

/*********************************************************
 * ACCIÓN
 *********************************************************/

function detectAction(
  text: string,
): "cotizacion" | "pedido" | null {
  const normalized =
    normalizeText(text);

  if (
    normalized.includes(
      "cotizacion",
    ) ||
    normalized.includes(
      "cotizar",
    ) ||
    normalized.includes(
      "presupuesto",
    )
  ) {
    return "cotizacion";
  }

  if (
    normalized.includes(
      "pedido",
    ) ||
    normalized.includes(
      "comprar",
    ) ||
    normalized.includes(
      "compra",
    ) ||
    normalized.includes(
      "directo",
    )
  ) {
    return "pedido";
  }

  return null;
}

/*********************************************************
 * CANTIDADES
 *********************************************************/

function parseNumber(
  text: string,
): number | null {
  const normalized =
    normalizeText(text);

  const directMatch =
    normalized.match(
      /\b(\d+)\b/,
    );

  if (directMatch) {
    const value =
      Number(
        directMatch[1],
      );

    return value > 0
      ? value
      : null;
  }

  const wordNumbers: Record<
    string,
    number
  > = {
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
  };

  for (
    const [word, value]
    of Object.entries(
      wordNumbers,
    )
  ) {
    if (
      normalized === word
    ) {
      return value;
    }
  }

  return null;
}

function parseSingleProductQuantity(
  text: string,
  products: string[],
): Record<string, number> | null {
  if (
    products.length !== 1
  ) {
    return null;
  }

  const quantity =
    parseNumber(text);

  if (!quantity) {
    return null;
  }

  return {
    [products[0]]:
      quantity,
  };
}

function parseEqualQuantities(
  text: string,
  products: string[],
): Record<string, number> | null {
  const normalized =
    normalizeText(text);

  const looksEqual =
    normalized.includes(
      "de cada uno",
    ) ||
    normalized.includes(
      "cada uno",
    ) ||
    normalized.includes(
      "cada producto",
    ) ||
    normalized.includes(
      "por cada uno",
    );

  if (!looksEqual) {
    return null;
  }

  const quantity =
    parseNumber(
      normalized,
    );

  if (!quantity) {
    return null;
  }

  return Object.fromEntries(
    products.map(
      (product) => [
        product,
        quantity,
      ],
    ),
  );
}

function escapeRegExp(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function parseIndividualQuantities(
  text: string,
  products: string[],
): Record<string, number> | null {
  const normalized =
    normalizeText(text);

  const result: Record<
    string,
    number
  > = {};

  for (
    const product
    of products
  ) {
    const productName =
      normalizeText(
        product,
      );

    const escapedProduct =
      escapeRegExp(
        productName,
      );

    const patterns = [
      new RegExp(
        `\\b(\\d+)\\s+(?:de\\s+)?${escapedProduct}\\b`,
        "i",
      ),
      new RegExp(
        `\\b${escapedProduct}\\s+(\\d+)\\b`,
        "i",
      ),
    ];

    for (
      const pattern
      of patterns
    ) {
      const match =
        normalized.match(
          pattern,
        );

      if (match?.[1]) {
        result[product] =
          Number(
            match[1],
          );

        break;
      }
    }
  }

  return Object.keys(
    result,
  ).length > 0
    ? result
    : null;
}

/*********************************************************
 * CONFIRMACIÓN CANTIDADES
 *********************************************************/

function buildQuantityConfirmation(
  session: WhatsAppSession,
): string {
  const lines =
    session.products.map(
      (product) => {
        const quantity =
          session.quantities[
            product
          ] ?? 0;

        return `${quantity} ${product}`;
      },
    );

  return (
    `Perfecto 😊 Entendí ${lines.join(", ")}.\n\n` +
    "¿Me indicas tu nombre o el nombre de tu negocio?"
  );
}

/*********************************************************
 * RESPUESTA COTIZACIÓN
 *********************************************************/

function buildQuoteReply(
  result: {
    numero?: string;
    total?: number;
    pdfUrl?: string;
    documentoUrl?: string;
    mensaje?: string;
  },
): string {
  const lines: string[] = [
    "¡Listo! 😊 Tu cotización fue generada correctamente.",
  ];

  if (
    result.numero
  ) {
    lines.push(
      `Cotización: ${result.numero}`,
    );
  }

  if (
    typeof result.total ===
      "number" &&
    Number.isFinite(
      result.total,
    )
  ) {
    lines.push(
      `Total: ${formatClp(
        result.total,
      )}`,
    );
  }

  const documentUrl =
    result.pdfUrl ||
    result.documentoUrl;

  if (documentUrl) {
    lines.push(
      `Documento: ${documentUrl}`,
    );
  }

  lines.push(
    "",
    "También fue enviada al correo que nos indicaste.",
  );

  return lines.join("\n");
}

/*********************************************************
 * CONVERSACIÓN
 *********************************************************/

export async function handleWhatsAppConversation(
  phone: string,
  incomingText: string,
): Promise<ConversationResult> {

  const session =
    await getWhatsAppSession(
      phone,
    );

  /*******************************************************
   * SALIDA GLOBAL
   *******************************************************/

  if (
    session.step !== "idle" &&
    isConversationExit(
      incomingText,
    )
  ) {
    await resetWhatsAppSession(
      phone,
    );

    return {
      handled: true,
      reply:
        "Perfecto 😊 Cerré esta solicitud. Cuando quieras volver a consultar o cotizar, aquí estaré.",
    };
  }

  /*******************************************************
   * CONSULTAS ESPECÍFICAS → EJECUTIVO
   *******************************************************/

  if (
    session.step === "idle" &&
    (
      isExecutiveQuestion(
        incomingText,
      ) ||
      isExactStockQuestion(
        incomingText,
      ) ||
      isSpecificShippingQuestion(
        incomingText,
      )
    )
  ) {
    return {
      handled: true,
      reply:
        buildExecutiveReply(),
    };
  }

  /*******************************************************
   * CAFÉ MOLIDO 1 KG
   *
   * No se ofrece actualmente.
   *******************************************************/

  if (
    session.step === "idle" &&
    isOneKgGroundCoffeeQuestion(
      incomingText,
    )
  ) {
    return {
      handled: true,
      reply:
        buildExecutiveReply(),
    };
  }

  /*******************************************************
   * ENVÍOS GENERALES
   *******************************************************/

  if (
    session.step === "idle" &&
    isGeneralShippingQuestion(
      incomingText,
    )
  ) {
    return {
      handled: true,
      reply:
        buildShippingReply(),
    };
  }

  /*******************************************************
   * CATEGORÍA
   *******************************************************/

  if (
    session.step === "idle" &&
    isCategoryBrowseQuestion(
      incomingText,
    )
  ) {
    try {
      const category =
        await findWhatsAppCategory(
          incomingText,
        );

      if (category) {
        return {
          handled: true,
          reply:
            buildCategoryReply(
              category,
            ),
        };
      }
    } catch (error) {
      console.error(
        "[WHATSAPP CATEGORY ERROR]",
        error,
      );

      return {
        handled: true,
        reply:
          buildExecutiveReply(),
      };
    }
  }

  /*******************************************************
   * CONSULTA GENÉRICA DE CAFÉ
   *
   * Aquí evitamos que:
   *
   * "¿Cuánto vale el café en grano?"
   *
   * seleccione arbitrariamente una variedad.
   *******************************************************/

  if (
    session.step === "idle" &&
    isGenericCoffeeQuestion(
      incomingText,
    )
  ) {
    try {
      const presentation =
        detectCoffeePresentation(
          incomingText,
        );

      const coffeeProducts =
        await findCoffeeOptions(
          presentation,
        );

      return {
        handled: true,
        reply:
          buildCoffeeOptionsReply(
            coffeeProducts,
            presentation,
          ),
      };
    } catch (error) {
      console.error(
        "[WHATSAPP COFFEE OPTIONS ERROR]",
        error,
      );

      return {
        handled: true,
        reply:
          buildExecutiveReply(),
      };
    }
  }

  /*******************************************************
   * CATÁLOGO GENERAL
   *******************************************************/

  if (
    session.step === "idle" &&
    isCatalogQuestion(
      incomingText,
    )
  ) {
    try {
      const reply =
        await buildCatalogReply();

      return {
        handled: true,
        reply,
      };
    } catch (error) {
      console.error(
        "[WHATSAPP CATALOG ERROR]",
        error,
      );

      return {
        handled: true,
        reply:
          buildExecutiveReply(),
      };
    }
  }

  /*******************************************************
   * PRODUCTO ESPECÍFICO
   *******************************************************/

  if (
    session.step === "idle"
  ) {
    try {
      const match =
        await findWhatsAppProduct(
          incomingText,
        );

      if (match) {
        const product =
          match.product;

        const wantsPrice =
          isPriceQuestion(
            incomingText,
          );

        const wantsStock =
          isStockQuestion(
            incomingText,
          );

        if (
          wantsPrice &&
          wantsStock
        ) {
          return {
            handled: true,
            reply:
              buildProductPriceAndStockReply(
                product,
              ),
          };
        }

        if (
          wantsPrice
        ) {
          return {
            handled: true,
            reply:
              buildProductPriceReply(
                product,
              ),
          };
        }

        if (
          wantsStock
        ) {
          return {
            handled: true,
            reply:
              buildProductStockReply(
                product,
              ),
          };
        }

        if (
          hasPurchaseIntent(
            incomingText,
          )
        ) {
          if (
            product.stock <= 0
          ) {
            return {
              handled: true,
              reply:
                buildExecutiveReply(),
            };
          }

          await setSessionProducts(
            phone,
            [
              product.name,
            ],
          );

          return {
            handled: true,
            reply:
              `Claro 😊 Anoté ${product.name}. ¿Cuántas unidades necesitas?`,
          };
        }

        return {
          handled: true,
          reply:
            buildProductPriceReply(
              product,
            ) +
            "\n\nSi quieres comprarlo o cotizarlo, dime cuántas unidades necesitas 😊",
        };
      }
    } catch (error) {
      console.error(
        "[WHATSAPP PRODUCT SEARCH ERROR]",
        error,
      );
    }
  }

  /*******************************************************
   * CANTIDADES
   *******************************************************/

  if (
    session.step ===
      "waiting_quantities"
  ) {
    const quantities =
      parseSingleProductQuantity(
        incomingText,
        session.products,
      ) ??
      parseEqualQuantities(
        incomingText,
        session.products,
      ) ??
      parseIndividualQuantities(
        incomingText,
        session.products,
      );

    if (!quantities) {
      return {
        handled: true,
        reply:
          session.products.length ===
            1
            ? `¿Cuántas unidades de ${session.products[0]} necesitas? Puedes responder, por ejemplo, “2”.`
            : "No alcancé a identificar las cantidades 😊 Puedes escribir, por ejemplo, “2 de cada uno”.",
      };
    }

    const updated =
      await setSessionQuantities(
        phone,
        quantities,
      );

    return {
      handled: true,
      reply:
        buildQuantityConfirmation(
          updated,
        ),
    };
  }

  /*******************************************************
   * NOMBRE / NEGOCIO
   *******************************************************/

  if (
    session.step ===
      "waiting_customer_name"
  ) {
    const name =
      incomingText.trim();

    if (
      name.length < 2
    ) {
      return {
        handled: true,
        reply:
          "¿Me indicas tu nombre o el nombre de tu negocio?",
      };
    }

    await setSessionCustomerName(
      phone,
      name,
    );

    return {
      handled: true,
      reply:
        `Gracias, ${name} 😊 ¿En qué localidad necesitas la entrega?`,
    };
  }

  /*******************************************************
   * LOCALIDAD
   *******************************************************/

  if (
    session.step ===
      "waiting_location"
  ) {
    const location =
      incomingText.trim();

    if (
      location.length < 2
    ) {
      return {
        handled: true,
        reply:
          "¿En qué localidad necesitas recibir el pedido?",
      };
    }

    const updated =
      await setSessionLocation(
        phone,
        location,
      );

    if (
      !sessionIsComplete(
        updated,
      )
    ) {
      return {
        handled: true,
        reply:
          "Me falta un dato para completar la solicitud. ¿Puedes indicármelo nuevamente?",
      };
    }

    return {
      handled: true,
      reply:
        buildSessionSummary(
          updated,
        ) +
        "\n\n¿Está correcto?",
    };
  }

  /*******************************************************
   * CONFIRMACIÓN
   *******************************************************/

  if (
    session.step ===
      "waiting_confirmation"
  ) {
    if (
      isConfirmation(
        incomingText,
      )
    ) {
      await setSessionWaitingAction(
        phone,
      );

      return {
        handled: true,
        reply:
          "Perfecto 😊 ¿Quieres que preparemos una cotización o prefieres hacer el pedido directamente?",
      };
    }

    if (
      isCancellation(
        incomingText,
      )
    ) {
      await resetWhatsAppSession(
        phone,
      );

      return {
        handled: true,
        reply:
          "No hay problema 👍 Cancelé esta solicitud. Cuando quieras comenzamos nuevamente.",
      };
    }

    return {
      handled: true,
      reply:
        "Solo necesito confirmar 😊 ¿Está correcto el resumen? Puedes responder “sí” o “cancelar”.",
    };
  }

  /*******************************************************
   * COTIZACIÓN O PEDIDO
   *******************************************************/

  if (
    session.step ===
      "waiting_action"
  ) {
    const action =
      detectAction(
        incomingText,
      );

    if (!action) {
      return {
        handled: true,
        reply:
          "Claro 😊 ¿Prefieres una cotización o deseas hacer el pedido directamente?",
      };
    }

    if (
      action ===
        "cotizacion"
    ) {
      await setSessionWaitingEmail(
        phone,
      );

      return {
        handled: true,
        reply:
          "Perfecto 😊 ¿A qué correo electrónico quieres que enviemos la cotización?",
      };
    }

    await setSessionAction(
      phone,
      "pedido",
    );

    await resetWhatsAppSession(
      phone,
    );

    return {
      handled: true,
      reply:
        "Perfecto 😊 Continuaremos contigo por este mismo WhatsApp para coordinar el pedido, pago y entrega.",
    };
  }

  /*******************************************************
   * EMAIL + COTIZACIÓN
   *******************************************************/

  if (
    session.step ===
      "waiting_email"
  ) {
    if (
      isConversationExit(
        incomingText,
      )
    ) {
      await resetWhatsAppSession(
        phone,
      );

      return {
        handled: true,
        reply:
          "De acuerdo 😊 Cerré la solicitud. Cuando quieras retomarla, escríbeme nuevamente.",
      };
    }

    const email =
      incomingText
        .trim()
        .toLowerCase();

    if (
      !isValidEmail(
        email,
      )
    ) {
      return {
        handled: true,
        reply:
          "No alcancé a reconocer un correo válido 😊 Puedes escribirlo, por ejemplo: nombre@correo.cl. También puedes escribir “cancelar” para salir.",
      };
    }

    try {
      const updatedSession =
        await setSessionEmail(
          phone,
          email,
        );

      const quote =
        await createWhatsAppQuote(
          updatedSession,
        );

      if (
        !quote.ok
      ) {
        console.error(
          "[WHATSAPP QUOTE ERROR]",
          quote,
        );

        return {
          handled: true,
          reply:
            "No pude completar la cotización en este momento. Te atenderá un ejecutivo de Lican Coffee por este mismo WhatsApp 😊",
        };
      }

      await resetWhatsAppSession(
        phone,
      );

      return {
        handled: true,
        reply:
          buildQuoteReply(
            quote,
          ),
      };
    } catch (error) {
      console.error(
        "[WHATSAPP QUOTE EXCEPTION]",
        error,
      );

      return {
        handled: true,
        reply:
          "No pude completar la cotización en este momento. Te atenderá un ejecutivo de Lican Coffee por este mismo WhatsApp 😊",
      };
    }
  }

  return {
    handled: false,
  };
}
