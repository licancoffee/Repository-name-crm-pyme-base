import type {
    ClientConfig,
  } from "@/lib/config/client";
  
  export type SetupValidationResult =
    | {
        ok: true;
        config: ClientConfig;
      }
    | {
        ok: false;
        errors: string[];
      };
  
  function isObject(
    value: unknown,
  ): value is Record<string, unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    );
  }
  
  function asString(
    value: unknown,
  ): string {
    return typeof value === "string"
      ? value.trim()
      : "";
  }
  
  function asBoolean(
    value: unknown,
    fallback = false,
  ): boolean {
    return typeof value === "boolean"
      ? value
      : fallback;
  }
  
  export function validateSetupConfig(
    raw: unknown,
  ): SetupValidationResult {
    if (!isObject(raw)) {
      return {
        ok: false,
        errors: [
          "La configuración recibida no es válida.",
        ],
      };
    }
  
    const errors: string[] = [];
  
    const company =
      isObject(raw.company)
        ? raw.company
        : {};
  
    const branding =
      isObject(raw.branding)
        ? raw.branding
        : {};
  
    const modules =
      isObject(raw.modules)
        ? raw.modules
        : {};
  
    const payments =
      isObject(raw.payments)
        ? raw.payments
        : {};
  
    const shipping =
      isObject(raw.shipping)
        ? raw.shipping
        : {};
  
    const whatsapp =
      isObject(raw.whatsapp)
        ? raw.whatsapp
        : {};
  
    const commercial =
      isObject(raw.commercial)
        ? raw.commercial
        : {};
  
    const integrations =
      isObject(raw.integrations)
        ? raw.integrations
        : {};
  
    const appsScript =
      isObject(
        integrations.appsScript,
      )
        ? integrations.appsScript
        : {};
  
    const googleSheets =
      isObject(
        integrations.googleSheets,
      )
        ? integrations.googleSheets
        : {};
  
    const name =
      asString(company.name);
  
    const legalName =
      asString(
        company.legalName,
      );
  
    const rut =
      asString(company.rut);
  
    const email =
      asString(company.email);
  
    if (name.length < 2) {
      errors.push(
        "El nombre comercial es obligatorio.",
      );
    }
  
    if (
      legalName.length < 2
    ) {
      errors.push(
        "La razón social es obligatoria.",
      );
    }
  
    if (rut.length < 4) {
      errors.push(
        "El RUT es obligatorio.",
      );
    }
  
    if (
      !email.includes("@")
    ) {
      errors.push(
        "El correo no es válido.",
      );
    }
  
    const primaryColor =
      asString(
        branding.primaryColor,
      );
  
    const secondaryColor =
      asString(
        branding.secondaryColor,
      );
  
    const accentColor =
      asString(
        branding.accentColor,
      );
  
    const hexColorPattern =
      /^#[0-9a-fA-F]{6}$/;
  
    for (const [
      label,
      value,
    ] of [
      [
        "color principal",
        primaryColor,
      ],
      [
        "color secundario",
        secondaryColor,
      ],
      [
        "color de acento",
        accentColor,
      ],
    ] as const) {
      if (
        !hexColorPattern.test(
          value,
        )
      ) {
        errors.push(
          `El ${label} debe usar formato hexadecimal, por ejemplo #0F172A.`,
        );
      }
    }
  
    const paymentMethods =
      Array.isArray(
        payments.methods,
      )
        ? payments.methods.filter(
            (
              item,
            ): item is
              | "EFECTIVO"
              | "TRANSFERENCIA"
              | "DEBITO"
              | "CREDITO"
              | "OTRO" =>
              typeof item ===
                "string" &&
              [
                "EFECTIVO",
                "TRANSFERENCIA",
                "DEBITO",
                "CREDITO",
                "OTRO",
              ].includes(
                item,
              ),
          )
        : [];
  
    if (
      errors.length > 0
    ) {
      return {
        ok: false,
        errors,
      };
    }
  
    const defaultPriceType =
      commercial.defaultPriceType ===
        "PREFERENTE" ||
      commercial.defaultPriceType ===
        "PERSONALIZADO"
        ? commercial.defaultPriceType
        : "LISTA";
  
    const volumePricingRules =
      Array.isArray(
        commercial.volumePricingRules,
      )
        ? commercial.volumePricingRules
        : [];
  
    const config: ClientConfig = {
      setupVersion:
        typeof raw.setupVersion ===
          "number"
          ? raw.setupVersion
          : 1,
  
      company: {
        name,
        legalName,
        rut,
        phone:
          asString(
            company.phone,
          ),
        email,
        address:
          asString(
            company.address,
          ),
        city:
          asString(
            company.city,
          ),
        website:
          asString(
            company.website,
          ),
        logoUrl:
          asString(
            company.logoUrl,
          ),
        currency:
          asString(
            company.currency,
          ) || "CLP",
        country:
          asString(
            company.country,
          ) || "Chile",
      },
  
      branding: {
        primaryColor,
        secondaryColor,
        accentColor,
        logoUrl:
          asString(
            branding.logoUrl,
          ),
      },
  
      commercial: {
        saleIdPrefix:
          asString(
            commercial.saleIdPrefix,
          ) || "VT",
        defaultPriceType,
        allowManualPrice:
          asBoolean(
            commercial.allowManualPrice,
            true,
          ),
        allowDiscounts:
          asBoolean(
            commercial.allowDiscounts,
            true,
          ),
        allowQuotes:
          asBoolean(
            commercial.allowQuotes,
            true,
          ),
        volumePricingRules:
          volumePricingRules as ClientConfig["commercial"]["volumePricingRules"],
      },
  
      modules: {
        dashboard:
          asBoolean(
            modules.dashboard,
            true,
          ),
        customers:
          asBoolean(
            modules.customers,
            true,
          ),
        inventory:
          asBoolean(
            modules.inventory,
            true,
          ),
        sales:
          asBoolean(
            modules.sales,
            true,
          ),
        quotes:
          asBoolean(
            modules.quotes,
            true,
          ),
        history:
          asBoolean(
            modules.history,
            true,
          ),
        whatsapp:
          asBoolean(
            modules.whatsapp,
            false,
          ),
        kaizen:
          asBoolean(
            modules.kaizen,
            false,
          ),
      },
  
      payments: {
        enabled:
          asBoolean(
            payments.enabled,
            true,
          ),
        methods:
          paymentMethods,
        instructions:
          asString(
            payments.instructions,
          ),
      },
  
      shipping: {
        enabled:
          asBoolean(
            shipping.enabled,
            true,
          ),
        askLocation:
          asBoolean(
            shipping.askLocation,
            true,
          ),
        instructions:
          asString(
            shipping.instructions,
          ),
      },
  
      whatsapp: {
        enabled:
          asBoolean(
            whatsapp.enabled,
            false,
          ),
        assistantName:
          asString(
            whatsapp.assistantName,
          ) ||
          "Asistente",
        humanHandoffEnabled:
          asBoolean(
            whatsapp.humanHandoffEnabled,
            true,
          ),
        quoteFlowEnabled:
          asBoolean(
            whatsapp.quoteFlowEnabled,
            true,
          ),
      },
  
      integrations: {
        appsScript: {
          enabled:
            asBoolean(
              appsScript.enabled,
              true,
            ),
          urlEnvName:
            asString(
              appsScript.urlEnvName,
            ) ||
            "ERP_APPS_SCRIPT_URL",
          tokenEnvName:
            asString(
              appsScript.tokenEnvName,
            ) ||
            "CRM_API_TOKEN",
        },
  
        googleSheets: {
          enabled:
            asBoolean(
              googleSheets.enabled,
              false,
            ),
          spreadsheetIdEnvName:
            asString(
              googleSheets.spreadsheetIdEnvName,
            ) ||
            "ERP_SPREADSHEET_ID",
        },
      },
    };
  
    return {
      ok: true,
      config,
    };
  }
  