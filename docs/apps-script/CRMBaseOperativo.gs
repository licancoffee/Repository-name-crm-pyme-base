const CRM_BASE_OPERATIVO_VERSION = "1.0.0";

const CRM_BASE_SHEETS = {
  VENTAS: "CRM_VENTAS",
  ITEMS: "CRM_VENTAS_ITEMS",
  INVENTARIO: "CRM_INVENTARIO",
  MOVIMIENTOS: "CRM_MOVIMIENTOS",
};

const CRM_BASE_HEADERS = {
  CRM_VENTAS: [
    "CLIENT_ID",
    "VENTA_ID",
    "FECHA",
    "CLIENTE",
    "TELEFONO",
    "DIRECCION",
    "TIPO_CLIENTE",
    "FORMA_PAGO",
    "OBSERVACION",
    "ESTADO",
    "TOTAL",
    "SALE_JSON",
    "CREATED_AT",
    "UPDATED_AT",
  ],
  CRM_VENTAS_ITEMS: [
    "CLIENT_ID",
    "VENTA_ID",
    "CODIGO",
    "PRODUCTO",
    "FORMATO",
    "CANTIDAD",
    "UNIDADES",
    "PRECIO_UNITARIO",
    "DESCUENTO",
    "SUBTOTAL",
    "CREATED_AT",
  ],
  CRM_INVENTARIO: [
    "CLIENT_ID",
    "CODIGO",
    "PRODUCTO",
    "STOCK_ACTUAL",
    "STOCK_MINIMO",
    "UNIDAD_CONTROL",
    "UPDATED_AT",
  ],
  CRM_MOVIMIENTOS: [
    "CLIENT_ID",
    "MOVIMIENTO_ID",
    "FECHA",
    "TIPO",
    "VENTA_ID",
    "CODIGO",
    "PRODUCTO",
    "UNIDADES",
    "STOCK_ANTERIOR",
    "STOCK_NUEVO",
    "OBSERVACION",
  ],
};

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || "ping").trim();
    const token = String((e && e.parameter && e.parameter.token) || "");

    validarTokenOperativo_(token);
    asegurarEstructuraOperativa_();

    if (action === "ping") {
      return jsonOperativo_({
        ok: true,
        version: CRM_BASE_OPERATIVO_VERSION,
        clientId: getClientIdOperativo_(),
        mensaje: "Conexión operativa verificada.",
      });
    }

    if (action === "bootstrap") {
      return jsonOperativo_({
        ok: true,
        version: CRM_BASE_OPERATIVO_VERSION,
        clientId: getClientIdOperativo_(),
        productos: obtenerProductosOperativos_(),
        clientes: obtenerClientesOperativos_(),
        inventario: obtenerInventarioOperativo_(),
        ventas: obtenerVentasOperativas_(),
      });
    }

    return jsonOperativo_({
      ok: false,
      error: "ACCION_NO_SOPORTADA",
      mensaje: "Acción GET no soportada: " + action,
    });
  } catch (error) {
    return jsonOperativo_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function doPost(e) {
  try {
    const payload = parsePayloadOperativo_(e);

    validarTokenOperativo_(payload.token);
    asegurarEstructuraOperativa_();

    const action = String(payload.action || "").trim();

    if (action === "ping") {
      return jsonOperativo_({
        ok: true,
        version: CRM_BASE_OPERATIVO_VERSION,
        clientId: getClientIdOperativo_(),
        mensaje: "Conexión operativa verificada.",
      });
    }

    if (action === "registrarVenta") {
      return jsonOperativo_(registrarVentaOperativa_(payload));
    }

    if (action === "anularVenta") {
      return jsonOperativo_(anularVentaOperativa_(payload));
    }

    return jsonOperativo_({
      ok: false,
      error: "ACCION_NO_SOPORTADA",
      mensaje: "Acción POST no soportada: " + action,
    });
  } catch (error) {
    return jsonOperativo_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function registrarVentaOperativa_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ventaId = String(payload.ventaId || "").trim();

    if (!ventaId) {
      throw new Error("VENTA_ID_REQUERIDO");
    }

    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!items.length) {
      throw new Error("VENTA_SIN_ITEMS");
    }

    const clientId = getClientIdOperativo_();
    const ventaExistente = buscarVentaOperativa_(ventaId);

    if (ventaExistente) {
      return {
        ok: true,
        data: {
          ventaId: ventaId,
          duplicada: true,
          estado: ventaExistente.estado,
          mensaje: "La venta ya estaba registrada. No se duplicó.",
        },
      };
    }

    const inventario = obtenerInventarioMapOperativo_();
    const movimientosPendientes = [];
    const inventarioActualizado = [];

    items.forEach(function(item) {
      const codigo = String(item.codigo || "").trim();
      const producto = String(item.producto || codigo || "Producto").trim();
      const unidades = Number(item.unidades || 0);

      if (!codigo) {
        throw new Error("ITEM_SIN_CODIGO");
      }

      if (!Number.isFinite(unidades) || unidades <= 0) {
        throw new Error("UNIDADES_INVALIDAS:" + codigo);
      }

      const inv = inventario[codigo];

      if (!inv) {
        throw new Error("PRODUCTO_SIN_INVENTARIO:" + codigo);
      }

      const stockAnterior = Number(inv.stockActual || 0);
      const stockNuevo = stockAnterior - unidades;

      if (stockNuevo < 0) {
        throw new Error("STOCK_INSUFICIENTE:" + producto);
      }

      movimientosPendientes.push({
        codigo: codigo,
        producto: producto,
        unidades: unidades,
        stockAnterior: stockAnterior,
        stockNuevo: stockNuevo,
      });

      inventarioActualizado.push({
        codigo: codigo,
        producto: producto,
        unidadesDescontadas: unidades,
        stockActual: stockNuevo,
      });
    });

    const now = new Date();
    const fecha = payload.fecha ? new Date(payload.fecha) : now;
    const cliente = payload.cliente || {};
    const total = items.reduce(function(sum, item) {
      return sum + Number(item.subtotal || 0);
    }, 0);

    const ventasSheet = getSheetOperativa_(CRM_BASE_SHEETS.VENTAS);
    ventasSheet.appendRow([
      clientId,
      ventaId,
      fecha,
      String(cliente.nombre || "Sin cliente"),
      String(cliente.telefono || ""),
      String(cliente.direccion || ""),
      String(cliente.tipoCliente || ""),
      String(payload.formaPago || ""),
      String(payload.observacion || ""),
      "ACTIVA",
      total,
      JSON.stringify(payload),
      now,
      now,
    ]);

    const itemsSheet = getSheetOperativa_(CRM_BASE_SHEETS.ITEMS);
    items.forEach(function(item) {
      itemsSheet.appendRow([
        clientId,
        ventaId,
        String(item.codigo || ""),
        String(item.producto || ""),
        String(item.formato || ""),
        Number(item.cantidad || 0),
        Number(item.unidades || 0),
        Number(item.precioUnitario || 0),
        Number(item.descuento || 0),
        Number(item.subtotal || 0),
        now,
      ]);
    });

    movimientosPendientes.forEach(function(mov, index) {
      actualizarInventarioOperativo_(mov.codigo, mov.stockNuevo, now);
      registrarMovimientoOperativo_({
        movimientoId: ventaId + "-SALIDA-" + String(index + 1),
        fecha: now,
        tipo: "SALIDA_VENTA",
        ventaId: ventaId,
        codigo: mov.codigo,
        producto: mov.producto,
        unidades: mov.unidades,
        stockAnterior: mov.stockAnterior,
        stockNuevo: mov.stockNuevo,
        observacion: "Venta registrada desde CRM Base",
      });
    });

    return {
      ok: true,
      data: {
        ventaId: ventaId,
        duplicada: false,
        estado: "ACTIVA",
        inventarioActualizado: inventarioActualizado,
        mensaje: "Venta registrada correctamente.",
      },
    };
  } finally {
    lock.releaseLock();
  }
}

function anularVentaOperativa_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ventaId = String(payload.ventaId || "").trim();

    if (!ventaId) {
      throw new Error("VENTA_ID_REQUERIDO");
    }

    const venta = buscarVentaOperativa_(ventaId);

    if (!venta) {
      throw new Error("VENTA_NO_ENCONTRADA");
    }

    if (venta.estado === "ANULADA") {
      return {
        ok: true,
        data: {
          ventaId: ventaId,
          estado: "ANULADA",
          duplicada: true,
          mensaje: "La venta ya estaba anulada.",
        },
      };
    }

    const items = obtenerItemsVentaOperativa_(ventaId);
    const inventario = obtenerInventarioMapOperativo_();
    const now = new Date();

    items.forEach(function(item, index) {
      const codigo = String(item.codigo || "").trim();
      const unidades = Number(item.unidades || 0);
      const inv = inventario[codigo];
      const stockAnterior = inv ? Number(inv.stockActual || 0) : 0;
      const stockNuevo = stockAnterior + unidades;

      actualizarInventarioOperativo_(codigo, stockNuevo, now);
      registrarMovimientoOperativo_({
        movimientoId: ventaId + "-ANULA-" + String(index + 1),
        fecha: now,
        tipo: "ENTRADA_ANULACION",
        ventaId: ventaId,
        codigo: codigo,
        producto: String(item.producto || codigo),
        unidades: unidades,
        stockAnterior: stockAnterior,
        stockNuevo: stockNuevo,
        observacion: "Reposición por anulación de venta",
      });
    });

    marcarVentaAnuladaOperativa_(ventaId, now);

    return {
      ok: true,
      data: {
        ventaId: ventaId,
        estado: "ANULADA",
        duplicada: false,
        mensaje: "Venta anulada correctamente.",
      },
    };
  } finally {
    lock.releaseLock();
  }
}

function asegurarEstructuraOperativa_() {
  Object.keys(CRM_BASE_HEADERS).forEach(function(sheetName) {
    const sheet = getOrCreateSheetOperativa_(sheetName);
    asegurarHeadersOperativos_(sheet, CRM_BASE_HEADERS[sheetName]);
  });

  inicializarInventarioDesdeInstalador_();
}

function inicializarInventarioDesdeInstalador_() {
  const productos = obtenerProductosInstalador_();
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.INVENTARIO);
  const existing = obtenerInventarioMapOperativo_();
  const now = new Date();
  const clientId = getClientIdOperativo_();

  productos.forEach(function(producto) {
    const codigo = String(producto.id || "").trim();

    if (!codigo || existing[codigo]) {
      return;
    }

    sheet.appendRow([
      clientId,
      codigo,
      String(producto.name || codigo),
      Number(producto.stock || 0),
      Number(producto.min || 0),
      String(producto.stockUnitLabel || "unidad"),
      now,
    ]);
  });
}

function obtenerProductosOperativos_() {
  return obtenerProductosInstalador_().map(function(producto) {
    return {
      codigo: String(producto.id || ""),
      nombre: String(producto.name || ""),
      categoria: String(producto.category || ""),
      unidadStock: String(producto.stockUnitLabel || "unidad"),
      kgPorUnidad: Number(producto.kgPerUnit || 0),
      costoNeto: Number(producto.netCost || 0),
      stockMinimo: Number(producto.min || 0),
      formatoDefault: String(producto.format || "Unidad"),
      precioDefault: Number(producto.price || 0),
      formats: Array.isArray(producto.formats) ? producto.formats : [],
    };
  });
}

function obtenerClientesOperativos_() {
  return obtenerClientesInstalador_().map(function(cliente) {
    return {
      id: String(cliente.id || ""),
      nombre: String(cliente.name || ""),
      telefono: String(cliente.phone || ""),
      direccion: String(cliente.address || ""),
      tipoPrecio: String(cliente.priceType || "LISTA"),
      observacion: String(cliente.note || ""),
    };
  });
}

function obtenerInventarioOperativo_() {
  const map = obtenerInventarioMapOperativo_();

  return Object.keys(map).map(function(codigo) {
    const inv = map[codigo];
    return {
      codigo: codigo,
      producto: inv.producto,
      unidadControl: inv.unidadControl,
      stockFisico: inv.stockActual,
      stockMinimo: inv.stockMinimo,
      equivalenteKg: 0,
    };
  });
}

function obtenerVentasOperativas_() {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.VENTAS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  return values.slice(1)
    .filter(function(row) {
      return String(row[header.CLIENT_ID] || "") === clientId;
    })
    .map(function(row) {
      const ventaId = String(row[header.VENTA_ID] || "");
      const items = obtenerItemsVentaOperativa_(ventaId);

      return {
        ventaId: ventaId,
        fecha: toIsoOperativo_(row[header.FECHA]),
        cliente: String(row[header.CLIENTE] || "Sin cliente"),
        telefono: String(row[header.TELEFONO] || ""),
        formaPago: String(row[header.FORMA_PAGO] || ""),
        observacion: String(row[header.OBSERVACION] || ""),
        estado: String(row[header.ESTADO] || "ACTIVA"),
        total: Number(row[header.TOTAL] || 0),
        items: items,
      };
    });
}

function obtenerProductosInstalador_() {
  const rows = getInstallerRowsOperativo_("CLIENT_PRODUCTS");
  const clientId = getClientIdOperativo_();

  return rows
    .filter(function(row) {
      return String(row.CLIENT_ID || "") === clientId;
    })
    .map(function(row) {
      const raw = String(row.PRODUCT_JSON || "").trim();

      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (error) {
          // Continúa con fallback estructurado.
        }
      }

      return {
        id: String(row.PRODUCT_ID || ""),
        name: String(row.NOMBRE || ""),
        category: String(row.CATEGORIA || ""),
        stockUnitLabel: String(row.UNIDAD_STOCK || "unidad"),
        kgPerUnit: Number(row.KG_POR_UNIDAD || 0),
        netCost: Number(row.COSTO_NETO || 0),
        stock: Number(row.STOCK || 0),
        min: Number(row.STOCK_MINIMO || 0),
        format: String(row.FORMATO_DEFAULT || "Unidad"),
        price: Number(row.PRECIO_DEFAULT || 0),
        formats: [],
      };
    });
}

function obtenerClientesInstalador_() {
  const rows = getInstallerRowsOperativo_("CLIENT_CUSTOMERS");
  const clientId = getClientIdOperativo_();

  return rows
    .filter(function(row) {
      return String(row.CLIENT_ID || "") === clientId;
    })
    .map(function(row) {
      const raw = String(row.CUSTOMER_JSON || "").trim();

      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (error) {
          // Continúa con fallback estructurado.
        }
      }

      return {
        id: String(row.CUSTOMER_ID || ""),
        name: String(row.NOMBRE || ""),
        phone: String(row.TELEFONO || ""),
        address: String(row.DIRECCION || ""),
        priceType: String(row.TIPO_PRECIO || "LISTA"),
        note: String(row.OBSERVACION || ""),
      };
    });
}

function getInstallerRowsOperativo_(sheetName) {
  const installerId = getRequiredPropertyOperativo_("SETUP_SPREADSHEET_ID");
  const book = SpreadsheetApp.openById(installerId);
  const sheet = book.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error("HOJA_INSTALADOR_NO_ENCONTRADA:" + sheetName);
  }

  const values = sheet.getDataRange().getValues();

  if (!values.length) {
    return [];
  }

  const headers = values[0].map(function(value) {
    return String(value || "").trim();
  });

  return values.slice(1).map(function(row) {
    const out = {};
    headers.forEach(function(header, index) {
      out[header] = row[index];
    });
    return out;
  });
}

function obtenerInventarioMapOperativo_() {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.INVENTARIO);
  const values = sheet.getDataRange().getValues();
  const map = {};

  if (values.length <= 1) {
    return map;
  }

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  values.slice(1).forEach(function(row, index) {
    if (String(row[header.CLIENT_ID] || "") !== clientId) {
      return;
    }

    const codigo = String(row[header.CODIGO] || "").trim();

    if (!codigo) {
      return;
    }

    map[codigo] = {
      rowNumber: index + 2,
      codigo: codigo,
      producto: String(row[header.PRODUCTO] || codigo),
      stockActual: Number(row[header.STOCK_ACTUAL] || 0),
      stockMinimo: Number(row[header.STOCK_MINIMO] || 0),
      unidadControl: String(row[header.UNIDAD_CONTROL] || "unidad"),
    };
  });

  return map;
}

function actualizarInventarioOperativo_(codigo, stockNuevo, now) {
  const map = obtenerInventarioMapOperativo_();
  const inv = map[codigo];

  if (!inv) {
    throw new Error("PRODUCTO_SIN_INVENTARIO:" + codigo);
  }

  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.INVENTARIO);
  const header = headerMapOperativo_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);

  sheet.getRange(inv.rowNumber, header.STOCK_ACTUAL + 1).setValue(stockNuevo);
  sheet.getRange(inv.rowNumber, header.UPDATED_AT + 1).setValue(now);
}

function registrarMovimientoOperativo_(mov) {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.MOVIMIENTOS);

  sheet.appendRow([
    getClientIdOperativo_(),
    mov.movimientoId,
    mov.fecha,
    mov.tipo,
    mov.ventaId,
    mov.codigo,
    mov.producto,
    mov.unidades,
    mov.stockAnterior,
    mov.stockNuevo,
    mov.observacion || "",
  ]);
}

function buscarVentaOperativa_(ventaId) {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.VENTAS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return null;
  }

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  for (var i = 1; i < values.length; i += 1) {
    const row = values[i];

    if (
      String(row[header.CLIENT_ID] || "") === clientId &&
      String(row[header.VENTA_ID] || "") === ventaId
    ) {
      return {
        rowNumber: i + 1,
        estado: String(row[header.ESTADO] || "ACTIVA"),
      };
    }
  }

  return null;
}

function marcarVentaAnuladaOperativa_(ventaId, now) {
  const venta = buscarVentaOperativa_(ventaId);

  if (!venta) {
    throw new Error("VENTA_NO_ENCONTRADA");
  }

  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.VENTAS);
  const header = headerMapOperativo_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);

  sheet.getRange(venta.rowNumber, header.ESTADO + 1).setValue("ANULADA");
  sheet.getRange(venta.rowNumber, header.UPDATED_AT + 1).setValue(now);
}

function obtenerItemsVentaOperativa_(ventaId) {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.ITEMS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  return values.slice(1)
    .filter(function(row) {
      return (
        String(row[header.CLIENT_ID] || "") === clientId &&
        String(row[header.VENTA_ID] || "") === ventaId
      );
    })
    .map(function(row) {
      return {
        codigo: String(row[header.CODIGO] || ""),
        producto: String(row[header.PRODUCTO] || ""),
        formato: String(row[header.FORMATO] || ""),
        cantidad: Number(row[header.CANTIDAD] || 0),
        unidades: Number(row[header.UNIDADES] || 0),
        precioUnitario: Number(row[header.PRECIO_UNITARIO] || 0),
        descuento: Number(row[header.DESCUENTO] || 0),
        subtotal: Number(row[header.SUBTOTAL] || 0),
      };
    });
}

function validarTokenOperativo_(tokenRecibido) {
  const tokenEsperado = getRequiredPropertyOperativo_("CRM_API_TOKEN");
  const recibido = String(tokenRecibido || "").trim();
  const esperado = String(tokenEsperado || "").trim();

  if (!recibido || recibido !== esperado) {
    throw new Error("Token CRM inválido.");
  }

  return true;
}

function getClientIdOperativo_() {
  return getRequiredPropertyOperativo_("CLIENT_ID");
}

function getRequiredPropertyOperativo_(name) {
  const value = PropertiesService
    .getScriptProperties()
    .getProperty(name);

  if (!value || !String(value).trim()) {
    throw new Error(name + " no configurado en Script Properties.");
  }

  return String(value).trim();
}

function getOperationalSpreadsheetOperativo_() {
  const explicitId = PropertiesService
    .getScriptProperties()
    .getProperty("OPERATIONAL_SPREADSHEET_ID");

  if (explicitId && String(explicitId).trim()) {
    return SpreadsheetApp.openById(String(explicitId).trim());
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();

  if (!active) {
    throw new Error("OPERATIONAL_SPREADSHEET_ID no configurado.");
  }

  return active;
}

function getOrCreateSheetOperativa_(sheetName) {
  const book = getOperationalSpreadsheetOperativo_();
  return book.getSheetByName(sheetName) || book.insertSheet(sheetName);
}

function getSheetOperativa_(sheetName) {
  const sheet = getOperationalSpreadsheetOperativo_().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error("HOJA_OPERATIVA_NO_ENCONTRADA:" + sheetName);
  }

  return sheet;
}

function asegurarHeadersOperativos_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];

  headers.forEach(function(header, index) {
    if (String(current[index] || "").trim() !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });

  sheet.setFrozenRows(1);
}

function headerMapOperativo_(headerRow) {
  const map = {};
  headerRow.forEach(function(value, index) {
    map[String(value || "").trim()] = index;
  });
  return map;
}

function parsePayloadOperativo_(e) {
  const raw = e && e.postData && e.postData.contents
    ? e.postData.contents
    : "{}";

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("PAYLOAD_JSON_INVALIDO");
  }
}

function toIsoOperativo_(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function jsonOperativo_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
