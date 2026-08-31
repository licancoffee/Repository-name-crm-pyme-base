/**
 * LICAN COFFEE — Backend ERP (Google Apps Script)
 * =================================================
 * Web App que recibe las ventas del CRM y las escribe en el ERP.
 *
 * Hojas usadas (NO se cambian encabezados ni columnas):
 *   VENTAS      A FECHA | B PRODUCTO | C CANTIDAD | D TOTAL | E CLIENTE | F TELEFONO | G ORIGEN | H COSTO | I UTILIDAD
 *   MOVIMIENTOS A FECHA | B TIPO | C PRODUCTO | D CANTIDAD | E COSTO | F TOTAL | G CLIENTE | H TELEFONO
 *   INVENTARIO  ... columna "SALIDAS VENTAS" (E). NUNCA se escribe "STOCK ACTUAL" (F, con fórmula).
 *
 * ORIGEN se escribe como  CRM|<ventaId>|<MEDIO_PAGO>  para poder:
 *   - detectar duplicados por ventaId (idempotencia)
 *   - reconstruir el historial en cualquier dispositivo
 *
 * DESPLIEGUE:
 *   1. Extensiones > Apps Script en el archivo del ERP.
 *   2. Pegar este código y guardar.
 *   3. Implementar > Nueva implementación > Aplicación web.
 *        Ejecutar como: Yo
 *        Quién tiene acceso: Cualquier persona
 *   4. Copiar la URL /exec y entregarla al CRM (secreto ERP_APPS_SCRIPT_URL).
 */

var SHEET_VENTAS = 'VENTAS';
var SHEET_MOVIMIENTOS = 'MOVIMIENTOS';
var SHEET_INVENTARIO = 'INVENTARIO';

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, error: 'JSON_INVALIDO', mensaje: 'No se pudo leer la solicitud.' });
  }

  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      return json({
        ok: false,
        error: 'OCUPADO',
        mensaje: 'Otra venta se está registrando en este momento. Reintenta en unos segundos.',
      });
    }
    switch (payload.action) {
      case 'ping':
        return json({ ok: true, mensaje: 'ERP conectado' });
      case 'registrarVenta':
        return json(registrarVenta(payload));
      case 'anularVenta':
        return json(anularVenta(payload));
      default:
        return json({ ok: false, error: 'ACCION_DESCONOCIDA', mensaje: 'Acción no soportada.' });
    }
  } catch (err) {
    return json({ ok: false, error: 'ERROR_INTERNO', mensaje: String((err && err.message) || err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

function doGet() {
  return json({ ok: true, mensaje: 'Lican Coffee ERP backend activo' });
}

/* ------------------------------------------------------------------ util */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function norm(v) {
  return String(v == null ? '' : v)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function toNum(v) {
  if (typeof v === 'number') return v;
  var n = Number(
    String(v == null ? '' : v)
      .replace(/[^\d.,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
  return isFinite(n) ? n : 0;
}

function sheet(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('No existe la hoja ' + name);
  return sh;
}

/** Índice de columna por cualquiera de los nombres dados (0-based, -1 si no existe). */
function colIndex(header, names) {
  for (var n = 0; n < names.length; n++) {
    var target = norm(names[n]);
    for (var i = 0; i < header.length; i++) {
      if (norm(header[i]) === target) return i;
    }
  }
  return -1;
}

/* --------------------------------------------------------- idempotencia */

function ventaYaRegistrada(ventaId) {
  var sh = sheet(SHEET_VENTAS);
  var last = sh.getLastRow();
  if (last < 2) return false;
  var origen = sh.getRange(2, 7, last - 1, 1).getValues(); // G = ORIGEN
  var needle = String(ventaId).toUpperCase();
  for (var i = 0; i < origen.length; i++) {
    var v = String(origen[i][0] || '').toUpperCase();
    if (v.indexOf(needle) !== -1) return true;
  }
  return false;
}

/* ------------------------------------------------------------ inventario */

function inventarioIndex() {
  var sh = sheet(SHEET_INVENTARIO);
  var last = sh.getLastRow();
  var lastCol = Math.max(sh.getLastColumn(), 9);
  var values = sh.getRange(1, 1, last, lastCol).getValues();
  var header = values[0];

  var iProd = colIndex(header, ['PRODUCTO', 'PRODUCTO OFICIAL', 'NOMBRE']);
  var iCod = colIndex(header, ['CODIGO', 'CÓDIGO']);
  var iSalidas = colIndex(header, ['SALIDAS VENTAS', 'SALIDAS']);
  var iStock = colIndex(header, ['STOCK ACTUAL', 'STOCK FISICO', 'STOCK FÍSICO']);
  if (iSalidas < 0) throw new Error('No se encontró la columna "Salidas Ventas" en INVENTARIO');
  if (iProd < 0 && iCod < 0) throw new Error('No se encontró la columna de producto en INVENTARIO');

  var byKey = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var nombre = iProd >= 0 ? String(row[iProd] || '').trim() : '';
    var codigo = iCod >= 0 ? String(row[iCod] || '').trim() : '';
    if (!nombre && !codigo) continue;
    var entry = {
      fila: r + 1,
      nombre: nombre || codigo,
      salidas: toNum(row[iSalidas]),
      stock: iStock >= 0 ? toNum(row[iStock]) : null,
    };
    if (nombre) byKey[norm(nombre)] = entry;
    if (codigo) byKey[norm(codigo)] = entry;
  }
  return { sheet: sh, byKey: byKey, colSalidas: iSalidas + 1, colStock: iStock >= 0 ? iStock + 1 : 0 };
}

function buscarInventario(inv, item) {
  var claves = [item.codigo, item.producto, item.nombre];
  for (var i = 0; i < claves.length; i++) {
    var k = norm(claves[i]);
    if (k && inv.byKey[k]) return inv.byKey[k];
  }
  return null;
}

/* -------------------------------------------------------- registrarVenta */

function registrarVenta(p) {
  if (!p.ventaId) return { ok: false, error: 'VENTA_ID_FALTANTE', mensaje: 'Falta ventaId.' };
  var items = p.items || [];
  if (!items.length) return { ok: false, error: 'SIN_ITEMS', mensaje: 'La venta no tiene productos.' };

  if (ventaYaRegistrada(p.ventaId)) {
    return {
      ok: true,
      duplicada: true,
      ventaId: p.ventaId,
      mensaje: 'La venta ya estaba registrada en el ERP.',
      inventarioActualizado: [],
    };
  }

  var inv = inventarioIndex();

  // 1) Validación total ANTES de escribir: producto existe y stock suficiente.
  var resueltos = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var fila = buscarInventario(inv, it);
    if (!fila) {
      return {
        ok: false,
        error: 'PRODUCTO_NO_ENCONTRADO',
        mensaje: 'El producto ' + (it.producto || it.codigo) + ' no existe en INVENTARIO.',
      };
    }
    var unidades = toNum(it.unidades);
    if (unidades <= 0) {
      return {
        ok: false,
        error: 'CANTIDAD_INVALIDA',
        mensaje: 'Cantidad inválida para ' + it.producto + '.',
      };
    }
    if (fila.stock !== null && unidades > fila.stock) {
      return {
        ok: false,
        error: 'STOCK_INSUFICIENTE',
        mensaje:
          'Stock insuficiente para ' + fila.nombre + '. Disponible: ' + fila.stock + ' unidades.',
      };
    }
    resueltos.push({ item: it, fila: fila, unidades: unidades });
  }

  var fecha = p.fechaISO ? new Date(p.fechaISO) : new Date();
  var origen = 'CRM|' + p.ventaId + '|' + String(p.medioPago || '').toUpperCase();
  var cliente = p.cliente || 'Sin cliente';
  var telefono = String(p.telefono || '');

  // 2) Escritura: VENTAS -> MOVIMIENTOS -> INVENTARIO (Salidas Ventas).
  var ventasRows = [];
  var movRows = [];
  for (var j = 0; j < resueltos.length; j++) {
    var r = resueltos[j];
    var it2 = r.item;
    ventasRows.push([
      fecha,
      r.fila.nombre,
      r.unidades,
      toNum(it2.total),
      cliente,
      telefono,
      origen,
      toNum(it2.costo),
      toNum(it2.utilidad),
    ]);
    movRows.push([
      fecha,
      'VENTA',
      r.fila.nombre,
      r.unidades,
      toNum(it2.costo),
      toNum(it2.total),
      cliente,
      telefono,
    ]);
  }

  var shV = sheet(SHEET_VENTAS);
  shV.getRange(shV.getLastRow() + 1, 1, ventasRows.length, 9).setValues(ventasRows);

  var shM = sheet(SHEET_MOVIMIENTOS);
  shM.getRange(shM.getLastRow() + 1, 1, movRows.length, 8).setValues(movRows);

  for (var k = 0; k < resueltos.length; k++) {
    var res = resueltos[k];
    var cell = inv.sheet.getRange(res.fila.fila, inv.colSalidas);
    cell.setValue(toNum(cell.getValue()) + res.unidades);
  }

  SpreadsheetApp.flush();

  // 3) Stock recalculado por la hoja (columna con fórmula).
  var actualizado = [];
  for (var m = 0; m < resueltos.length; m++) {
    var rr = resueltos[m];
    actualizado.push({
      codigo: rr.item.codigo || '',
      producto: rr.fila.nombre,
      unidadesDescontadas: rr.unidades,
      stockActual: inv.colStock
        ? toNum(inv.sheet.getRange(rr.fila.fila, inv.colStock).getValue())
        : null,
    });
  }

  return {
    ok: true,
    ventaId: p.ventaId,
    mensaje: 'Venta registrada correctamente',
    inventarioActualizado: actualizado,
  };
}

/* ------------------------------------------------------------ anularVenta */

function anularVenta(p) {
  if (!p.ventaId) return { ok: false, error: 'VENTA_ID_FALTANTE', mensaje: 'Falta ventaId.' };

  var shV = sheet(SHEET_VENTAS);
  var last = shV.getLastRow();
  if (last < 2) return { ok: false, error: 'VENTA_NO_ENCONTRADA', mensaje: 'La venta no existe en el ERP.' };

  var values = shV.getRange(2, 1, last - 1, 9).getValues();
  var needle = String(p.ventaId).toUpperCase();
  var filas = [];
  for (var i = 0; i < values.length; i++) {
    var origen = String(values[i][6] || '').toUpperCase();
    if (origen.indexOf(needle) !== -1) filas.push({ fila: i + 2, row: values[i] });
  }
  if (!filas.length) {
    return { ok: false, error: 'VENTA_NO_ENCONTRADA', mensaje: 'La venta no existe en el ERP.' };
  }
  if (String(filas[0].row[6]).toUpperCase().indexOf('ANULADA') !== -1) {
    return { ok: true, duplicada: true, ventaId: p.ventaId, mensaje: 'La venta ya estaba anulada.' };
  }

  var inv = inventarioIndex();
  var shM = sheet(SHEET_MOVIMIENTOS);
  var fecha = new Date();
  var movRows = [];

  for (var j = 0; j < filas.length; j++) {
    var row = filas[j].row;
    var nombre = String(row[1] || '');
    var unidades = toNum(row[2]);
    var entry = inv.byKey[norm(nombre)];
    if (entry) {
      var cell = inv.sheet.getRange(entry.fila, inv.colSalidas);
      cell.setValue(toNum(cell.getValue()) - unidades);
    }
    movRows.push([fecha, 'ANULACION', nombre, -unidades, toNum(row[7]), -toNum(row[3]), row[4], row[5]]);
    // Se marca la fila original como anulada en ORIGEN (no se borra historial).
    shV.getRange(filas[j].fila, 7).setValue(String(row[6]) + '|ANULADA');
  }

  shM.getRange(shM.getLastRow() + 1, 1, movRows.length, 8).setValues(movRows);
  SpreadsheetApp.flush();

  return { ok: true, ventaId: p.ventaId, mensaje: 'Venta anulada y stock devuelto', inventarioActualizado: [] };
}
