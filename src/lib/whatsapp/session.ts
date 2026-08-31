export type WhatsAppSessionStep =
  | "idle"
  | "waiting_cappuccino_variant"
  | "waiting_quantities"
  | "waiting_customer_name"
  | "waiting_location"
  | "waiting_confirmation"
  | "waiting_action"
  | "waiting_email";

export type WhatsAppSessionAction =
  | "cotizacion"
  | "pedido"
  | "";

export type WhatsAppSession = {
  phone: string;
  products: string[];
  quantities: Record<string, number>;
  customerName: string;
  email: string;
  location: string;
  action: WhatsAppSessionAction;
  step: WhatsAppSessionStep;
  updatedAt: number;
};

type AppsScriptResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

function createEmptySession(
  phone: string,
): WhatsAppSession {
  return {
    phone,
    products: [],
    quantities: {},
    customerName: "",
    email: "",
    location: "",
    action: "",
    step: "idle",
    updatedAt: Date.now(),
  };
}

function getConfig() {
  const url =
    process.env["ERP_APPS_SCRIPT_URL"];

  const token =
    process.env["CRM_API_TOKEN"];

  if (!url) {
    throw new Error(
      "Falta ERP_APPS_SCRIPT_URL",
    );
  }

  if (!token) {
    throw new Error(
      "Falta CRM_API_TOKEN",
    );
  }

  return {
    url,
    token,
  };
}

async function callAppsScript<T>(
  payload: Record<string, unknown>,
): Promise<AppsScriptResult<T>> {
  try {
    const { url, token } =
      getConfig();

    const response =
      await fetch(url, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          ...payload,
          token,
        }),
      });

    const text =
      await response.text();

    if (!response.ok) {
      console.error(
        "[WHATSAPP SESSION HTTP ERROR]",
        response.status,
        text,
      );

      return {
        ok: false,
        error:
          `HTTP ${response.status}`,
      };
    }

    const parsed =
      JSON.parse(text);

    if (
      !parsed ||
      parsed.ok !== true
    ) {
      console.error(
        "[WHATSAPP SESSION APPS SCRIPT ERROR]",
        parsed,
      );

      return {
        ok: false,
        error:
          parsed?.error ||
          "Apps Script rechazó la operación",
      };
    }

    return {
      ok: true,
      data: parsed.data as T,
    };
  } catch (error) {
    console.error(
      "[WHATSAPP SESSION ERROR]",
      error,
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

export async function getWhatsAppSession(
  phone: string,
): Promise<WhatsAppSession> {
  const result =
    await callAppsScript<WhatsAppSession>({
      action:
        "getWhatsAppSession",
      phone,
    });

  if (!result.ok) {
    return createEmptySession(
      phone,
    );
  }

  return {
    ...createEmptySession(phone),
    ...result.data,
    email:
      result.data?.email ?? "",
  };
}

export async function updateWhatsAppSession(
  phone: string,
  updates: Partial<WhatsAppSession>,
): Promise<WhatsAppSession> {
  const result =
    await callAppsScript<WhatsAppSession>({
      action:
        "updateWhatsAppSession",
      phone,
      updates,
    });

  if (!result.ok) {
    throw new Error(
      result.error,
    );
  }

  return result.data;
}

export async function resetWhatsAppSession(
  phone: string,
): Promise<WhatsAppSession> {
  const result =
    await callAppsScript<WhatsAppSession>({
      action:
        "resetWhatsAppSession",
      phone,
    });

  if (!result.ok) {
    throw new Error(
      result.error,
    );
  }

  return result.data;
}

export async function setWaitingCappuccinoVariant(
  phone: string,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      products: [],
      quantities: {},
      customerName: "",
      email: "",
      location: "",
      action: "",
      step:
        "waiting_cappuccino_variant",
    },
  );
}

export async function setSessionProducts(
  phone: string,
  products: string[],
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      products,
      quantities: {},
      customerName: "",
      email: "",
      location: "",
      action: "",
      step:
        "waiting_quantities",
    },
  );
}

export async function setSessionQuantities(
  phone: string,
  quantities: Record<string, number>,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      quantities,
      step:
        "waiting_customer_name",
    },
  );
}

export async function setSessionCustomerName(
  phone: string,
  customerName: string,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      customerName,
      step:
        "waiting_location",
    },
  );
}

export async function setSessionLocation(
  phone: string,
  location: string,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      location,
      step:
        "waiting_confirmation",
    },
  );
}

export async function setSessionWaitingAction(
  phone: string,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      step:
        "waiting_action",
    },
  );
}

export async function setSessionAction(
  phone: string,
  action: WhatsAppSessionAction,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      action,
    },
  );
}

export async function setSessionWaitingEmail(
  phone: string,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      action: "cotizacion",
      step: "waiting_email",
    },
  );
}

export async function setSessionEmail(
  phone: string,
  email: string,
): Promise<WhatsAppSession> {
  return updateWhatsAppSession(
    phone,
    {
      email: email.trim(),
      step: "waiting_email",
    },
  );
}

export function sessionIsComplete(
  session: WhatsAppSession,
): boolean {
  return (
    session.products.length > 0 &&
    Object.keys(
      session.quantities,
    ).length > 0 &&
    Boolean(
      session.customerName,
    ) &&
    Boolean(
      session.location,
    )
  );
}

export function quoteSessionIsComplete(
  session: WhatsAppSession,
): boolean {
  return (
    sessionIsComplete(session) &&
    Boolean(session.email) &&
    session.email.includes("@")
  );
}

export function buildSessionSummary(
  session: WhatsAppSession,
): string {
  const productLines =
    session.products
      .map((product) => {
        const quantity =
          session.quantities[
            product
          ] ?? 0;

        return `• ${product}: ${quantity}`;
      })
      .join("\n");

  return (
    "Perfecto 😊 Este es el resumen:\n\n" +
    `${productLines}\n\n` +
    `Nombre / negocio: ${session.customerName}\n` +
    `Localidad: ${session.location}`
  );
}
