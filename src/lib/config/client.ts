export type VolumePricingRule = {
  id: string;
  enabled: boolean;
  productNames: string[];
  minimumCombinedQuantity: number;
  normalPrice: number;
  volumePrice: number;
};

export type CompanyConfig = {
  name: string;
  legalName: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  website: string;
  logoUrl: string;
  currency: string;
  country: string;
};

export type BrandingConfig = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
};

export type CommercialConfig = {
  saleIdPrefix: string;
  defaultPriceType:
    | "LISTA"
    | "PREFERENTE"
    | "PERSONALIZADO";
  allowManualPrice: boolean;
  allowDiscounts: boolean;
  allowQuotes: boolean;
  volumePricingRules: VolumePricingRule[];
};

export type ModulesConfig = {
  dashboard: boolean;
  customers: boolean;
  inventory: boolean;
  sales: boolean;
  quotes: boolean;
  history: boolean;
  whatsapp: boolean;
  kaizen: boolean;
};

export type PaymentConfig = {
  enabled: boolean;
  methods: Array<
    | "EFECTIVO"
    | "TRANSFERENCIA"
    | "DEBITO"
    | "CREDITO"
    | "OTRO"
  >;
  instructions: string;
};

export type ShippingConfig = {
  enabled: boolean;
  askLocation: boolean;
  instructions: string;
};

export type WhatsAppConfig = {
  enabled: boolean;
  assistantName: string;
  humanHandoffEnabled: boolean;
  quoteFlowEnabled: boolean;
};

export type IntegrationConfig = {
  appsScript: {
    enabled: boolean;
    urlEnvName: string;
    /**
     * Campo legado V4. Se conserva únicamente para poder leer
     * configuraciones antiguas ya almacenadas. V3 no depende de él.
     */
    tokenEnvName?: string;
  };

  googleSheets: {
    enabled: boolean;
    spreadsheetIdEnvName: string;
  };
};

export type ClientConfig = {
  setupVersion: number;
  company: CompanyConfig;
  branding: BrandingConfig;
  commercial: CommercialConfig;
  modules: ModulesConfig;
  payments: PaymentConfig;
  shipping: ShippingConfig;
  whatsapp: WhatsAppConfig;
  integrations: IntegrationConfig;
};

export type DeepPartial<T> = {
  [K in keyof T]?:
    T[K] extends Array<infer U>
      ? Array<U>
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K];
};

import {
  defaultClientConfig,
} from "./client.defaults";

import {
  generatedClientConfig,
} from "./client.generated";

export function mergeClientConfig(
  base: ClientConfig,
  override:
    DeepPartial<ClientConfig>,
): ClientConfig {
  return {
    ...base,
    ...override,

    company: {
      ...base.company,
      ...override.company,
    },

    branding: {
      ...base.branding,
      ...override.branding,
    },

    commercial: {
      ...base.commercial,
      ...override.commercial,
      volumePricingRules:
        override.commercial?.volumePricingRules ??
        base.commercial.volumePricingRules,
    },

    modules: {
      ...base.modules,
      ...override.modules,
    },

    payments: {
      ...base.payments,
      ...override.payments,
      methods:
        override.payments?.methods ??
        base.payments.methods,
    },

    shipping: {
      ...base.shipping,
      ...override.shipping,
    },

    whatsapp: {
      ...base.whatsapp,
      ...override.whatsapp,
    },

    integrations: {
      ...base.integrations,
      ...override.integrations,

      appsScript: {
        ...base.integrations.appsScript,
        ...override.integrations?.appsScript,
      },

      googleSheets: {
        ...base.integrations.googleSheets,
        ...override.integrations?.googleSheets,
      },
    },
  };
}

function buildInitialClientConfig() {
  return mergeClientConfig(
    defaultClientConfig,
    generatedClientConfig,
  );
}

export const clientConfig =
  buildInitialClientConfig();

/**
 * Aplica la configuración de una empresa cargada en tiempo de ejecución.
 *
 * Se mantiene la identidad del objeto `clientConfig` para que todos los
 * módulos que ya lo importaron observen los nuevos valores sin conservar
 * datos de una empresa anterior.
 */
export function applyRuntimeClientConfig(
  runtimeConfig:
    DeepPartial<ClientConfig>,
) {
  const base =
    buildInitialClientConfig();

  const next =
    mergeClientConfig(
      base,
      runtimeConfig,
    );

  Object.assign(
    clientConfig,
    next,
  );

  return clientConfig;
}
