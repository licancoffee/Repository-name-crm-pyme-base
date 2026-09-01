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
    tokenEnvName: string;
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

/**
 * Combina una configuración parcial con la configuración base.
 *
 * Se usa tanto para:
 * 1. client.generated.ts
 * 2. configuración remota cargada por el instalador
 */
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
        override
          .commercial
          ?.volumePricingRules ??
        base
          .commercial
          .volumePricingRules,
    },

    modules: {
      ...base.modules,
      ...override.modules,
    },

    payments: {
      ...base.payments,
      ...override.payments,

      methods:
        override
          .payments
          ?.methods ??
        base
          .payments
          .methods,
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
        ...base
          .integrations
          .appsScript,

        ...override
          .integrations
          ?.appsScript,
      },

      googleSheets: {
        ...base
          .integrations
          .googleSheets,

        ...override
          .integrations
          ?.googleSheets,
      },
    },
  };
}

const initialClientConfig =
  mergeClientConfig(
    defaultClientConfig,
    generatedClientConfig,
  );

/**
 * Objeto compartido por todo el CRM.
 *
 * IMPORTANTE:
 * Se mantiene como un único objeto para que la configuración
 * remota pueda aplicarse antes de renderizar las rutas del CRM
 * sin cambiar todos los imports existentes.
 */
export const clientConfig:
  ClientConfig = {
  ...initialClientConfig,

  company: {
    ...initialClientConfig.company,
  },

  branding: {
    ...initialClientConfig.branding,
  },

  commercial: {
    ...initialClientConfig.commercial,

    volumePricingRules: [
      ...initialClientConfig
        .commercial
        .volumePricingRules,
    ],
  },

  modules: {
    ...initialClientConfig.modules,
  },

  payments: {
    ...initialClientConfig.payments,

    methods: [
      ...initialClientConfig
        .payments
        .methods,
    ],
  },

  shipping: {
    ...initialClientConfig.shipping,
  },

  whatsapp: {
    ...initialClientConfig.whatsapp,
  },

  integrations: {
    ...initialClientConfig.integrations,

    appsScript: {
      ...initialClientConfig
        .integrations
        .appsScript,
    },

    googleSheets: {
      ...initialClientConfig
        .integrations
        .googleSheets,
    },
  },
};

/**
 * Aplica una configuración remota al singleton clientConfig.
 *
 * El siguiente bloque del instalador llamará esta función
 * después de leer CONFIG_JSON desde CLIENT_CONFIG.
 */
export function applyRuntimeClientConfig(
  remoteConfig:
    DeepPartial<ClientConfig>,
): ClientConfig {
  const merged =
    mergeClientConfig(
      clientConfig,
      remoteConfig,
    );

  Object.assign(
    clientConfig,
    merged,
  );

  Object.assign(
    clientConfig.company,
    merged.company,
  );

  Object.assign(
    clientConfig.branding,
    merged.branding,
  );

  Object.assign(
    clientConfig.commercial,
    merged.commercial,
  );

  clientConfig
    .commercial
    .volumePricingRules = [
    ...merged
      .commercial
      .volumePricingRules,
  ];

  Object.assign(
    clientConfig.modules,
    merged.modules,
  );

  Object.assign(
    clientConfig.payments,
    merged.payments,
  );

  clientConfig
    .payments
    .methods = [
    ...merged
      .payments
      .methods,
  ];

  Object.assign(
    clientConfig.shipping,
    merged.shipping,
  );

  Object.assign(
    clientConfig.whatsapp,
    merged.whatsapp,
  );

  Object.assign(
    clientConfig.integrations,
    merged.integrations,
  );

  Object.assign(
    clientConfig
      .integrations
      .appsScript,
    merged
      .integrations
      .appsScript,
  );

  Object.assign(
    clientConfig
      .integrations
      .googleSheets,
    merged
      .integrations
      .googleSheets,
  );

  return clientConfig;
}
