const KAIZU_PILOT_GENERATOR_VERSION = "1.0.0";

const KAIZU_PILOT_HEADERS = {
  CRM_VENTAS: ["CLIENT_ID","VENTA_ID","FECHA","CLIENTE","TELEFONO","DIRECCION","TIPO_CLIENTE","FORMA_PAGO","OBSERVACION","ESTADO","TOTAL","SALE_JSON","CREATED_AT","UPDATED_AT"],
  CRM_VENTAS_ITEMS: ["CLIENT_ID","VENTA_ID","CODIGO","PRODUCTO","FORMATO","CANTIDAD","UNIDADES","PRECIO_UNITARIO","DESCUENTO","SUBTOTAL","CREATED_AT"],
  CRM_INVENTARIO: ["CLIENT_ID","CODIGO","PRODUCTO","STOCK_ACTUAL","STOCK_MINIMO","UNIDAD_CONTROL","UPDATED_AT"],
  CRM_MOVIMIENTOS: ["CLIENT_ID","MOVIMIENTO_ID","FECHA","TIPO","VENTA_ID","CODIGO","PRODUCTO","UNIDADES","STOCK_ANTERIOR","STOCK_NUEVO","OBSERVACION"],
  CRM_COTIZACIONES: ["CLIENT_ID","REQUEST_ID","NUMERO","FECHA","ESTADO","CLIENTE","EMPRESA","EMAIL","TELEFONO","DIRECCION","FORMA_PAGO","DESCUENTO","NETO","IVA","TOTAL","PDF_URL","DOCUMENTO_URL","OBSERVACIONES","QUOTE_JSON","VENTA_ID","FECHA_CONVERSION","CREATED_AT","UPDATED_AT"],
  CRM_COTIZACIONES_ITEMS: ["CLIENT_ID","NUMERO","SKU","PRODUCTO","FORMATO","CANTIDAD","PRECIO_UNITARIO","SUBTOTAL","CREATED_AT"],
};

function doGet() {
  return HtmlService.createHtmlOutput(getPilotGeneratorHtmlKaizu_())
    .setTitle("Kaizu - Generador de Pilotos")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function crearPilotoKaizu(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = normalizarPilotoKaizu_(form || {});
    validarPilotoKaizu_(data);

    const props = PropertiesService.getScriptProperties();
    const setupId = props.getProperty("SETUP_SPREADSHEET_ID");
    const comercialId = props.getProperty("COMMERCIAL_SPREADSHEET_ID");
    const folderId = props.getProperty("PILOTS_FOLDER_ID") || "";
    const crmBaseUrl = props.getProperty("CRM_BASE_URL") || "https://repository-name-crm-pyme-base.vercel.app";

    if (!setupId) throw new Error("Falta Script Property SETUP_SPREADSHEET_ID");
    if (!comercialId) throw new Error("Falta Script Property COMMERCIAL_SPREADSHEET_ID");

    const now = new Date();
    const clientId = generarClientIdPilotoKaizu_(data.negocio);
    const pilotoId = "PIL-" + Utilities.formatDate(now, Session.getScriptTimeZone() || "America/Santiago", "yyyyMMdd-HHmmss");
    const vence = new Date(now.getTime() + data.dias * 24 * 60 * 60 * 1000);

    const operational = crearPlanillaOperativaPilotoKaizu_(data, clientId, folderId);
    registrarConfigPilotoKaizu_(setupId, data, clientId, now);
    registrarPilotoComercialKaizu_(comercialId, {
      pilotoId,
      prospectoId: data.prospectoId,
      clientId,
      negocio: data.negocio,
      contacto: data.contacto,
      inicio: now,
      vence,
      dias: data.dias,
      estado: "PREPARACIÓN",
      urlCrm: crmBaseUrl + "/?clientId=" + encodeURIComponent(clientId),
      urlInstalador: crmBaseUrl + "/instalador?clientId=" + encodeURIComponent(clientId),
      operationalSheetId: operational.id,
      appsScriptUrl: "",
      decision: "",
      observaciones: data.observaciones,
    });

    return {
      ok: true,
      version: KAIZU_PILOT_GENERATOR_VERSION,
      pilotoId,
      clientId,
      negocio: data.negocio,
      inicio: now.toISOString(),
      vence: vence.toISOString(),
      dias: data.dias,
      operationalSheetId: operational.id,
      operationalSheetUrl: operational.url,
      crmUrl: crmBaseUrl + "/?clientId=" + encodeURIComponent(clientId),
      instaladorUrl: crmBaseUrl + "/instalador?clientId=" + encodeURIComponent(clientId),
      setupProductosUrl: crmBaseUrl + "/setup-productos?clientId=" + encodeURIComponent(clientId),
      setupClientesUrl: crmBaseUrl + "/setup-clientes?clientId=" + encodeURIComponent(clientId),
      setupConexionUrl: crmBaseUrl + "/setup-conexion?clientId=" + encodeURIComponent(clientId),
      scriptProperties: {
        CLIENT_ID: clientId,
        SETUP_SPREADSHEET_ID: setupId,
        OPERATIONAL_SPREADSHEET_ID: operational.id,
      },
      siguientePaso: "Crear Apps Script operativo con CRMBaseOperativoV4.gs, configurar las 3 Script Properties, desplegar como Web App y registrar la URL /exec en Paso 4.",
    };
  } finally {
    lock.releaseLock();
  }
}

function normalizarPilotoKaizu_(form) {
  return {
    prospectoId: String(form.prospectoId || "").trim(),
    negocio: String(form.negocio || "").trim(),
    razonSocial: String(form.razonSocial || form.negocio || "").trim(),
    rut: String(form.rut || "PILOTO").trim(),
    contacto: String(form.contacto || "").trim(),
    telefono: String(form.telefono || "").trim(),
    email: String(form.email || "").trim(),
    direccion: String(form.direccion || "").trim(),
    ciudad: String(form.ciudad || "").trim(),
    dias: Math.max(1, Math.min(30, Number(form.dias || 7))),
    observaciones: String(form.observaciones || "").trim(),
  };
}

function validarPilotoKaizu_(data) {
  if (!data.negocio) throw new Error("El nombre del negocio es obligatorio.");
  if (!data.contacto) throw new Error("El nombre del contacto es obligatorio.");
  if (!data.telefono && !data.email) throw new Error("Ingresa al menos teléfono o correo.");
}

function generarClientIdPilotoKaizu_(negocio) {
  const slug = String(negocio || "PILOTO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "PILOTO";
  return "PILOTO-" + slug + "-" + Utilities.getUuid().slice(0, 4).toUpperCase();
}

function crearPlanillaOperativaPilotoKaizu_(data, clientId, folderId) {
  const ss = SpreadsheetApp.create("Kaizu Piloto - " + data.negocio + " - " + clientId);
  ss.setSpreadsheetTimeZone("America/Santiago");
  const first = ss.getSheets()[0];
  first.setName("CRM_VENTAS");

  Object.keys(KAIZU_PILOT_HEADERS).forEach(function(name, index) {
    const sheet = index === 0 ? first : ss.insertSheet(name);
    const headers = KAIZU_PILOT_HEADERS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  });

  if (folderId) {
    try {
      const file = DriveApp.getFileById(ss.getId());
      const folder = DriveApp.getFolderById(folderId);
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (error) {
      console.warn("No fue posible mover planilla piloto a carpeta", error);
    }
  }

  return { id: ss.getId(), url: ss.getUrl() };
}

function registrarConfigPilotoKaizu_(setupId, data, clientId, now) {
  const ss = SpreadsheetApp.openById(setupId);
  const sheet = ss.getSheetByName("CLIENT_CONFIG");
  if (!sheet) throw new Error("No existe CLIENT_CONFIG en instalador central.");

  const config = {
    setupVersion: 1,
    company: {
      name: data.negocio,
      legalName: data.razonSocial,
      rut: data.rut,
      phone: data.telefono,
      email: data.email,
      address: data.direccion,
      city: data.ciudad,
      website: "",
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
      whatsapp: true,
      kaizen: false,
    },
    payments: {
      enabled: true,
      methods: ["EFECTIVO", "TRANSFERENCIA", "DEBITO", "CREDITO"],
      instructions: "",
    },
    shipping: {
      enabled: true,
      askLocation: true,
      instructions: "",
    },
    whatsapp: {
      enabled: true,
      assistantName: "Kai",
      humanHandoffEnabled: true,
      quoteFlowEnabled: true,
    },
    integrations: {
      appsScript: {
        enabled: true,
        urlEnvName: "ERP_APPS_SCRIPT_URL",
      },
      googleSheets: {
        enabled: false,
        spreadsheetIdEnvName: "ERP_SPREADSHEET_ID",
      },
    },
  };

  sheet.appendRow([
    clientId,
    data.rut,
    data.negocio,
    data.razonSocial,
    data.email,
    "CONFIGURADO",
    1,
    JSON.stringify(config),
    now,
    now,
  ]);
}

function registrarPilotoComercialKaizu_(comercialId, p) {
  const ss = SpreadsheetApp.openById(comercialId);
  const sheet = ss.getSheetByName("PILOTOS");
  if (!sheet) throw new Error("No existe hoja PILOTOS en Kaizu Comercial.");

  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 16).setValues([[
    p.pilotoId,
    p.prospectoId,
    p.clientId,
    p.negocio,
    p.contacto,
    p.inicio,
    p.vence,
    "",
    p.estado,
    p.urlCrm,
    p.urlInstalador,
    p.operationalSheetId,
    p.appsScriptUrl,
    "",
    p.decision,
    p.observaciones,
  ]]);

  sheet.getRange(row, 8)
    .setFormula("=MAX(0;ROUNDUP(G" + row + "-NOW();0))");
}

function getPilotGeneratorHtmlKaizu_() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;color:#0f172a}.wrap{max-width:820px;margin:32px auto;padding:16px}.card{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.06)}h1{margin-top:0}.brand{font-weight:800;letter-spacing:.04em}.tag{font-weight:700;color:#334155}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.full{grid-column:1/-1}label{display:block;font-size:13px;font-weight:700;margin-bottom:6px}input,textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:10px}button{margin-top:18px;background:#0f172a;color:white;border:0;border-radius:10px;padding:13px 18px;font-weight:700;cursor:pointer}.muted{color:#64748b;font-size:14px}.result{margin-top:18px;padding:16px;background:#ecfeff;border-radius:12px;display:none}.error{margin-top:18px;padding:16px;background:#fef2f2;border-radius:12px;display:none}code{word-break:break-all}@media(max-width:640px){.grid{grid-template-columns:1fr}}
</style></head><body><div class="wrap"><div class="card">
<h1><span class="brand">KAIZU</span> · Generador de Pilotos</h1><p class="tag">Ordena. Vende. Crece.</p><p class="muted">Crea un piloto comercial de 7 días y deja preparada su instalación operativa.</p>
<div class="grid">
<div><label>Negocio *</label><input id="negocio"></div><div><label>Contacto *</label><input id="contacto"></div>
<div><label>RUT</label><input id="rut" placeholder="Opcional"></div><div><label>Razón social</label><input id="razonSocial"></div>
<div><label>Teléfono</label><input id="telefono"></div><div><label>Correo</label><input id="email" type="email"></div>
<div><label>Ciudad</label><input id="ciudad"></div><div><label>Días de prueba</label><input id="dias" type="number" value="7" min="1" max="30"></div>
<div class="full"><label>Dirección</label><input id="direccion"></div><div class="full"><label>Observaciones</label><textarea id="observaciones" rows="3"></textarea></div>
</div>
<button id="crear" onclick="crear()">Crear piloto 7 días</button>
<div id="error" class="error"></div><div id="result" class="result"></div>
</div></div>
<script>
function v(id){return document.getElementById(id).value.trim()}
function crear(){
 const b=document.getElementById('crear'); b.disabled=true; b.textContent='Creando piloto...';
 document.getElementById('error').style.display='none'; document.getElementById('result').style.display='none';
 google.script.run.withSuccessHandler(function(r){b.disabled=false;b.textContent='Crear piloto 7 días'; const el=document.getElementById('result');el.style.display='block';el.innerHTML='<b>Piloto Kaizu creado</b><br><br>CLIENT_ID: <code>'+r.clientId+'</code><br>Vence: '+new Date(r.vence).toLocaleString()+'<br><br><a target="_blank" href="'+r.operationalSheetUrl+'">Abrir planilla operativa</a><br><a target="_blank" href="'+r.setupProductosUrl+'">Cargar productos</a><br><a target="_blank" href="'+r.setupClientesUrl+'">Cargar clientes</a><br><a target="_blank" href="'+r.setupConexionUrl+'">Paso 4 · Conexión</a><br><br><b>Script Properties</b><br><code>CLIENT_ID='+r.scriptProperties.CLIENT_ID+'<br>SETUP_SPREADSHEET_ID='+r.scriptProperties.SETUP_SPREADSHEET_ID+'<br>OPERATIONAL_SPREADSHEET_ID='+r.scriptProperties.OPERATIONAL_SPREADSHEET_ID+'</code><br><br>'+r.siguientePaso;}).withFailureHandler(function(e){b.disabled=false;b.textContent='Crear piloto 7 días';const el=document.getElementById('error');el.style.display='block';el.textContent=e.message||String(e);}).crearPilotoKaizu({negocio:v('negocio'),contacto:v('contacto'),rut:v('rut'),razonSocial:v('razonSocial'),telefono:v('telefono'),email:v('email'),ciudad:v('ciudad'),dias:v('dias'),direccion:v('direccion'),observaciones:v('observaciones')});
}
</script></body></html>`;
}
