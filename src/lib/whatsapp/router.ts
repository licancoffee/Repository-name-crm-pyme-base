import {
  clientConfig,
} from "../config/client";

export type WhatsAppIntent =
  | "saludo"
  | "agradecimiento"
  | "productos"
  | "precio"
  | "cotizacion"
  | "despacho"
  | "pago"
  | "ubicacion"
  | "humano"
  | "desconocido";

/*********************************************************
 * NORMALIZACIÓN
 *********************************************************/

function normalizeText(
  text: string,
): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9\s]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function includesAny(
  text: string,
  words: string[],
): boolean {
  return words.some(
    (word) =>
      text.includes(
        word,
      ),
  );
}

/*********************************************************
 * DETECCIÓN DE INTENCIÓN
 *
 * Este archivo no conoce productos específicos.
 * El catálogo se resuelve en conversation.ts
 * y catalog.ts.
 *********************************************************/

export function detectWhatsAppIntent(
  rawText: string,
): WhatsAppIntent {
  const text =
    normalizeText(
      rawText,
    );

  if (
    includesAny(
      text,
      [
        "gracias",
        "muchas gracias",
        "vale gracias",
        "ok gracias",
        "perfecto gracias",
        "te pasaste",
        "hasta luego",
        "nos vemos",
        "adios",
        "chao",
        "chau",
      ],
    )
  ) {
    return "agradecimiento";
  }

  if (
    includesAny(
      text,
      [
        "cotizar",
        "cotizacion",
        "cotizame",
        "presupuesto",
        "quiero comprar",
        "necesito comprar",
        "hacer pedido",
        "quiero pedir",
        "necesito pedir",
        "quiero cotizar",
        "necesito cotizar",
        "pedido",
      ],
    )
  ) {
    return "cotizacion";
  }

  if (
    includesAny(
      text,
      [
        "precio",
        "precios",
        "cuanto cuesta",
        "cuanto sale",
        "cuanto vale",
        "que valor tiene",
        "valor",
        "valores",
        "lista de precios",
        "me mandas los precios",
        "mandame los precios",
      ],
    )
  ) {
    return "precio";
  }

  if (
    includesAny(
      text,
      [
        "productos",
        "producto",
        "catalogo",
        "que venden",
        "que tienen",
        "que productos tienen",
        "que productos venden",
        "lista de productos",
        "ver productos",
      ],
    )
  ) {
    return "productos";
  }

  if (
    includesAny(
      text,
      [
        "despacho",
        "envio",
        "envios",
        "entrega",
        "reparto",
        "despachan",
        "hacen reparto",
        "hacen despacho",
        "hacen envios",
      ],
    )
  ) {
    return "despacho";
  }

  if (
    includesAny(
      text,
      [
        "pago",
        "pagar",
        "transferencia",
        "efectivo",
        "debito",
        "credito",
        "forma de pago",
        "formas de pago",
      ],
    )
  ) {
    return "pago";
  }

  if (
    includesAny(
      text,
      [
        "ubicacion",
        "ubicación",
        "donde estan",
        "donde están",
        "direccion",
        "dirección",
        "donde se encuentran",
        "donde quedan",
      ],
    )
  ) {
    return "ubicacion";
  }

  if (
    includesAny(
      text,
      [
        "persona",
        "humano",
        "ejecutivo",
        "vendedor",
        "asesor",
        "hablar con alguien",
        "quiero hablar con alguien",
        "quiero hablar con una persona",
      ],
    )
  ) {
    return "humano";
  }

  if (
    includesAny(
      text,
      [
        "hola",
        "buenas",
        "buen dia",
        "buenos dias",
        "buenas tardes",
        "buenas noches",
        "como estas",
        "que tal",
      ],
    )
  ) {
    return "saludo";
  }

  return "desconocido";
}

/*********************************************************
 * RESPUESTAS CONFIGURABLES
 *********************************************************/

function buildLocationResponse():
string {
  const {
    company,
    shipping,
  } = clientConfig;

  const address =
    company.address?.trim();

  const city =
    company.city?.trim();

  if (
    address &&
    city
  ) {
    return (
      `Estamos ubicados en ${address}, ${city} 📍` +
      (
        shipping.enabled
          ? " Si necesitas despacho, indícame tu localidad y revisamos las opciones disponibles."
          : ""
      )
    );
  }

  if (city) {
    return (
      `Estamos en ${city} 📍` +
      (
        shipping.enabled
          ? " Si necesitas despacho, indícame tu localidad y revisamos las opciones disponibles."
          : ""
      )
    );
  }

  return shipping.enabled
    ? "Claro 😊 Si necesitas conocer nuestra ubicación o coordinar una entrega, indícame tu localidad y te orientamos."
    : "Claro 😊 Puedo ayudarte con información de contacto y ubicación de la empresa.";
}

function buildShippingResponse():
string {
  const {
    shipping,
  } = clientConfig;

  if (!shipping.enabled) {
    return (
      "Por ahora esta instalación no tiene habilitado el módulo de despacho."
    );
  }

  if (
    shipping.instructions.trim()
  ) {
    return shipping.instructions.trim();
  }

  return (
    "Claro 🚚 Dime en qué localidad estás y revisamos las opciones de entrega disponibles."
  );
}

function buildPaymentResponse():
string {
  const {
    payments,
  } = clientConfig;

  if (!payments.enabled) {
    return (
      "Por ahora esta instalación no tiene habilitado el módulo de pagos."
    );
  }

  if (
    payments.instructions.trim()
  ) {
    return payments.instructions.trim();
  }

  if (
    payments.methods.length >
    0
  ) {
    const methods =
      payments.methods
        .map(
          (method) =>
            method
              .toLowerCase()
              .replace(
                /_/g,
                " ",
              ),
        )
        .join(", ");

    return (
      `Claro 👍 Las formas de pago habilitadas son: ${methods}.`
    );
  }

  return (
    "Claro 👍 Las condiciones de pago pueden depender de cada pedido. Dime qué necesitas comprar y te orientamos."
  );
}

function buildHumanResponse():
string {
  const {
    company,
    whatsapp,
  } = clientConfig;

  if (
    !whatsapp
      .humanHandoffEnabled
  ) {
    return (
      "Puedo seguir ayudándote por este mismo canal con productos, precios, disponibilidad y cotizaciones."
    );
  }

  return (
    `Por supuesto 😊 Déjame aquí lo que necesitas y una persona de ${company.name} podrá continuar contigo.`
  );
}

/*********************************************************
 * RESPUESTAS GENERALES
 *
 * Solo se utilizan cuando conversation.ts
 * no pudo resolver el mensaje directamente.
 *********************************************************/

export function buildWhatsAppResponse(
  intent: WhatsAppIntent,
): string {
  const {
    company,
    modules,
    whatsapp,
  } = clientConfig;

  if (
    !modules.whatsapp ||
    !whatsapp.enabled
  ) {
    return (
      "El canal automático de WhatsApp no está habilitado para esta instalación."
    );
  }

  const assistantName =
    whatsapp.assistantName ||
    "Asistente virtual";

  switch (intent) {
    case "saludo":
      return (
        `¡Hola! 👋 Soy ${assistantName}, asistente virtual de ${company.name}. ` +
        "Puedo ayudarte con productos, precios, disponibilidad y cotizaciones. ¿Qué necesitas?"
      );

    case "agradecimiento":
      return (
        "De nada 😊 Cuando necesites productos, precios o una cotización, aquí estaré."
      );

    case "productos":
      return (
        "Claro 😊 Puedo revisar nuestro catálogo actualizado. Dime qué producto o categoría buscas."
      );

    case "precio":
      return (
        "Claro 👍 Dime qué producto necesitas y revisaré su precio y disponibilidad."
      );

    case "cotizacion":
      if (
        !whatsapp
          .quoteFlowEnabled
      ) {
        return (
          "La generación automática de cotizaciones por WhatsApp no está habilitada para esta instalación."
        );
      }

      return (
        "Claro 😊 Dime qué producto necesitas y comenzamos tu cotización."
      );

    case "despacho":
      return buildShippingResponse();

    case "pago":
      return buildPaymentResponse();

    case "ubicacion":
      return buildLocationResponse();

    case "humano":
      return buildHumanResponse();

    default:
      return (
        "Cuéntame qué necesitas 😊 Puedo ayudarte con productos, precios, disponibilidad o cotizaciones."
      );
  }
}
