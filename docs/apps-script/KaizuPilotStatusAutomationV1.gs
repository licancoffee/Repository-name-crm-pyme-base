const KAIZU_PILOT_STATUS_AUTOMATION_VERSION = "1.0.0";

/**
 * Kaizu — Automatización de estados de pilotos
 *
 * Requiere Script Property:
 * COMMERCIAL_SPREADSHEET_ID
 *
 * Flujo administrado:
 * PREPARACION -> se mantiene manual hasta que el piloto esté listo
 * ACTIVO -> VENCE HOY -> VENCIDO
 * CONVERTIDO -> se conserva
 *
 * Esta automatización NO suspende técnicamente el CRM. Solo administra
 * el estado comercial del piloto en la planilla Kaizu - Prospectos y Pilotos.
 */
function actualizarEstadosPilotosKaizu() {
  const comercialId = PropertiesService.getScriptProperties()
    .getProperty("COMMERCIAL_SPREADSHEET_ID");

  if (!comercialId) {
    throw new Error("Falta Script Property COMMERCIAL_SPREADSHEET_ID");
  }

  const ss = SpreadsheetApp.openById(comercialId);
  ss.setSpreadsheetTimeZone("America/Santiago");

  const sheet = ss.getSheetByName("PILOTOS");
  if (!sheet) {
    throw new Error("No existe hoja PILOTOS.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      ok: true,
      version: KAIZU_PILOT_STATUS_AUTOMATION_VERSION,
      actualizados: 0,
    };
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0,
  );

  // F=INICIO, G=VENCE, H=DIAS, I=ESTADO
  const range = sheet.getRange(2, 6, lastRow - 1, 4);
  const values = range.getValues();
  let actualizados = 0;

  values.forEach(function(row, index) {
    const vence = row[1];
    const estadoActual = String(row[3] || "").trim().toUpperCase();

    if (!(vence instanceof Date) || isNaN(vence.getTime())) return;

    // PREPARACION y CONVERTIDO son estados de decisión manual.
    if (
      estadoActual === "PREPARACION" ||
      estadoActual === "PREPARACIÓN" ||
      estadoActual === "CONVERTIDO"
    ) return;

    const startOfExpiry = new Date(
      vence.getFullYear(), vence.getMonth(), vence.getDate(), 0, 0, 0, 0,
    );

    let nuevoEstado = "ACTIVO";
    if (startOfToday.getTime() > startOfExpiry.getTime()) {
      nuevoEstado = "VENCIDO";
    } else if (startOfToday.getTime() === startOfExpiry.getTime()) {
      nuevoEstado = "VENCE HOY";
    }

    const rowNumber = index + 2;
    sheet.getRange(rowNumber, 8)
      .setFormula("=MAX(0;ROUNDUP(G" + rowNumber + "-NOW();0))");

    if (estadoActual !== nuevoEstado) {
      sheet.getRange(rowNumber, 9).setValue(nuevoEstado);
      actualizados += 1;
    }
  });

  SpreadsheetApp.flush();

  return {
    ok: true,
    version: KAIZU_PILOT_STATUS_AUTOMATION_VERSION,
    actualizados,
    revisados: values.length,
  };
}

/** Ejecutar UNA sola vez para crear el trigger diario. */
function instalarTriggerEstadosPilotosKaizu() {
  eliminarTriggersEstadosPilotosKaizu_();

  ScriptApp.newTrigger("actualizarEstadosPilotosKaizu")
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();

  actualizarEstadosPilotosKaizu();

  return {
    ok: true,
    version: KAIZU_PILOT_STATUS_AUTOMATION_VERSION,
    mensaje: "Trigger diario Kaizu instalado.",
  };
}

function eliminarTriggersEstadosPilotosKaizu_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "actualizarEstadosPilotosKaizu") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}
