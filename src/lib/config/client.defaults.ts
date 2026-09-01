import type {
    ClientConfig,
  } from "./client";
  
  /**
   * Configuración base del CRM.
   *
   * Estos valores permiten ejecutar una instalación nueva
   * incluso antes de que el instalador genere la configuración
   * específica de un cliente.
   */
  export const defaultClientConfig: ClientConfig = {
    setupVersion: 1,
  
    company: {
      name: "Empresa Demo",
      legalName: "Empresa Demo SpA",
      rut: "76.000.000-0",
      phone: "+56 9 0000 0000",
      email: "contacto@empresa.cl",
      address: "Dirección comercial",
      city: "Ciudad",
      website: "https://empresa.cl",
      logoUrl: "/logo.png",
      currency: "CLP",
      country: "Chile",
    },
  
    branding: {
      primaryColor: "#0F172A",
      secondaryColor: "#334155",
      accentColor: "#14B8A6",
      logoUrl: "/logo.png",
    },
  
    commercial: {
      saleIdPrefix: "VT",
      defaultPriceType: "LISTA",
      allowManualPrice: true,
      allowDiscounts: true,
      allowQuotes: true,
      volumePricingRules: [],
    },
  
    modules: {
      dashboard: true,
      customers: true,
      inventory: true,
      sales: true,
      quotes: true,
      history: true,
      whatsapp: false,
      kaizen: false,
    },
  
    payments: {
      enabled: true,
      methods: [
        "EFECTIVO",
        "TRANSFERENCIA",
      ],
      instructions: "",
    },
  
    shipping: {
      enabled: true,
      askLocation: true,
      instructions: "",
    },
  
    whatsapp: {
      enabled: false,
      assistantName: "Kaizen",
      humanHandoffEnabled: true,
      quoteFlowEnabled: true,
    },
  
    integrations: {
      appsScript: {
        enabled: true,
        urlEnvName: "ERP_APPS_SCRIPT_URL",
        tokenEnvName: "CRM_API_TOKEN",
      },
  
      googleSheets: {
        enabled: false,
        spreadsheetIdEnvName: "ERP_SPREADSHEET_ID",
      },
    },
  };
  