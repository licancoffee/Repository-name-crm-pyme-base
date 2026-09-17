import type { ClientConfig } from "./client";

export const DEMO_CLIENT_ID = "KAIZU-DEMO";

export const demoClientConfig: ClientConfig = {
  setupVersion: 1,
  company: {
    name: "Cafetería Lago Sur",
    legalName: "Empresa demostrativa",
    rut: "76.000.000-0",
    phone: "+56 9 0000 0000",
    email: "demo@kaizu.cl",
    address: "Costanera 123",
    city: "Lican Ray",
    website: "https://kaizu.cl",
    logoUrl: "/kaizu-isotipo.png",
    currency: "CLP",
    country: "Chile",
  },
  branding: {
    primaryColor: "#0A3766",
    secondaryColor: "#0B8FA6",
    accentColor: "#14B8A6",
    logoUrl: "/kaizu-isotipo.png",
  },
  commercial: {
    saleIdPrefix: "DEMO",
    defaultPriceType: "LISTA",
    allowManualPrice: true,
    allowDiscounts: true,
    allowQuotes: false,
    volumePricingRules: [],
  },
  modules: {
    dashboard: true,
    customers: true,
    inventory: true,
    sales: true,
    quotes: false,
    history: true,
    whatsapp: false,
    kaizen: false,
  },
  payments: {
    enabled: true,
    methods: ["EFECTIVO", "TRANSFERENCIA", "DEBITO", "CREDITO"],
    instructions: "Datos exclusivamente demostrativos.",
  },
  shipping: {
    enabled: true,
    askLocation: true,
    instructions: "Entrega demostrativa.",
  },
  whatsapp: {
    enabled: false,
    assistantName: "Kaizen",
    humanHandoffEnabled: false,
    quoteFlowEnabled: false,
  },
  integrations: {
    appsScript: {
      enabled: false,
      urlEnvName: "ERP_APPS_SCRIPT_URL",
    },
    googleSheets: {
      enabled: false,
      spreadsheetIdEnvName: "ERP_SPREADSHEET_ID",
    },
  },
};
