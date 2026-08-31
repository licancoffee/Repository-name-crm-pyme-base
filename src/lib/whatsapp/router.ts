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
      text.includes(word),
  );
}

/*********************************************************
 * DETECCIÓN DE INTENCIÓN
 *
 * Este archivo NO conoce productos.
 * El catálogo real se resuelve en
 * conversation.ts + catalog.ts.
 *********************************************************/

export function detectWhatsAppIntent(
  rawText: string,
): WhatsAppIntent {

  const text =
    normalizeText(
      rawText,
    );

  /*******************************************************
   * CIERRE NATURAL
   *******************************************************/

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

  /*******************************************************
   * COTIZACIÓN / COMPRA
   *******************************************************/

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

  /*******************************************************
   * PRECIOS
   *******************************************************/

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

  /*******************************************************
   * CATÁLOGO / PRODUCTOS
   *******************************************************/

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

  /*******************************************************
   * DESPACHO
   *******************************************************/

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

  /*******************************************************
   * PAGO
   *******************************************************/

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

  /*******************************************************
   * UBICACIÓN
   *******************************************************/

  if (
    includesAny(
      text,
      [
        "ubicacion",
        "donde estan",
        "direccion",
        "lican ray",
        "licanray",
      ],
    )
  ) {
    return "ubicacion";
  }

  /*******************************************************
   * ATENCIÓN HUMANA
   *******************************************************/

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

  /*******************************************************
   * SALUDO
   *******************************************************/

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
 * RESPUESTAS GENERALES
 *
 * Solo se usan cuando conversation.ts
 * no resolvió el mensaje.
 *********************************************************/

export function buildWhatsAppResponse(
  intent: WhatsAppIntent,
): string {

  switch (intent) {

    case "saludo":
      return (
        "¡Hola! 👋 Soy Kaizen de Lican Coffee ☕ " +
        "Puedo ayudarte con productos, precios, disponibilidad y cotizaciones. ¿Qué necesitas?"
      );

    case "agradecimiento":
      return (
        "De nada 😊 Cuando necesites productos, precios o una cotización, aquí estaré."
      );

    case "productos":
      /*
       * Normalmente esta intención
       * será resuelta antes por
       * conversation.ts consultando ERP.
       */
      return (
        "Claro 😊 Puedo revisar nuestro catálogo actualizado. Dime qué producto buscas."
      );

    case "precio":
      /*
       * conversation.ts intenta resolver
       * producto + precio real antes
       * de llegar hasta aquí.
       */
      return (
        "Claro 👍 Dime qué producto necesitas y revisaré su precio y disponibilidad."
      );

    case "cotizacion":
      return (
        "Claro 😊 Dime qué producto necesitas y comenzamos tu cotización."
      );

    case "despacho":
      return (
        "Sí, coordinamos entregas 🚚 Dime en qué localidad estás y revisamos la mejor opción."
      );

    case "pago":
      return (
        "Claro 👍 Las condiciones de pago pueden depender del pedido. Dime qué necesitas comprar y te orientamos."
      );

    case "ubicacion":
      return (
        "Estamos en Lican Ray 📍 y trabajamos principalmente en la zona lacustre. ¿Desde qué localidad nos escribes?"
      );

    case "humano":
      return (
        "Por supuesto 😊 Déjame aquí lo que necesitas y una persona de Lican Coffee podrá continuar contigo."
      );

    default:
      return (
        "Cuéntame qué necesitas 😊 Puedo ayudarte con productos, precios, disponibilidad o cotizaciones."
      );
  }
}
