const CRM_BASE_OPERATIVO_VERSION = "1.1.0";

const CRM_BASE_SHEETS = {
  VENTAS: "CRM_VENTAS",
  ITEMS: "CRM_VENTAS_ITEMS",
  INVENTARIO: "CRM_INVENTARIO",
  MOVIMIENTOS: "CRM_MOVIMIENTOS",
  COTIZACIONES: "CRM_COTIZACIONES",
  COTIZACIONES_ITEMS: "CRM_COTIZACIONES_ITEMS",
};

const CRM_BASE_HEADERS = {
  CRM_VENTAS: [
    "CLIENT_ID", "VENTA_ID", "FECHA", "CLIENTE", "TELEFONO",
    "DIRECCION", "TIPO_CLIENTE", "FORMA_PAGO", "OBSERVACION",
    "ESTADO", "TOTAL", "SALE_JSON", "CREATED_AT", "UPDATED_AT",
  ],
  CRM_VENTAS_ITEMS: [
    "CLIENT_ID", "VENTA_ID", "CODIGO", "PRODUCTO", "FORMATO",
    "CANTIDAD", "UNIDADES", "PRECIO_UNITARIO", "DESCUENTO",
    "SUBTOTAL", "CREATED_AT",
  ],
  CRM_INVENTARIO: [
    "CLIENT_ID", "CODIGO", "PRODUCTO", "STOCK_ACTUAL", "STOCK_MINIMO",
    "UNIDAD_CONTROL", "UPDATED_AT",
  ],
  CRM_MOVIMIENTOS: [
    "CLIENT_ID", "MOVIMIENTO_ID", "FECHA", "TIPO", "VENTA_ID",
    "CODIGO", "PRODUCTO", "UNIDADES", "STOCK_ANTERIOR", "STOCK_NUEVO",
    "OBSERVACION",
  ],
  CRM_COTIZACIONES: [
    "CLIENT_ID", "REQUEST_ID", "NUMERO", "FECHA", "ESTADO", "CLIENTE",
    "EMPRESA", "EMAIL", "TELEFONO", "DIRECCION", "FORMA_PAGO",
    "DESCUENTO", "NETO", "IVA", "TOTAL", "PDF_URL", "DOCUMENTO_URL",
    "OBSERVACIONES", "QUOTE_JSON", "VENTA_ID", "FECHA_CONVERSION",
    "CREATED_AT", "UPDATED_AT",
  ],
  CRM_COTIZACIONES_ITEMS: [
    "CLIENT_ID", "NUMERO", "SKU", "PRODUCTO", "FORMATO", "CANTIDAD",
    "PRECIO_UNITARIO", "SUBTOTAL", "CREATED_AT",
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
    return jsonErrorOperativo_(error);
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

    if (action === "crearCotizacion") {
      return jsonOperativo_(crearCotizacionOperativa_(payload));
    }

    if (action === "listarCotizaciones") {
      return jsonOperativo_({
        ok: true,
        data: listarCotizacionesOperativas_(),
      });
    }

    if (action === "buscarCotizacion") {
      const cotizacion = buscarCotizacionOperativa_(payload.numero);
      if (!cotizacion) {
        return jsonOperativo_({
          ok: false,
          error: "COTIZACION_NO_ENCONTRADA",
          mensaje: "No se encontró la cotización " + String(payload.numero || "") + ".",
        });
      }
      return jsonOperativo_({ ok: true, data: cotizacion });
    }

    if (action === "marcarCotizacionConvertida") {
      return jsonOperativo_(marcarCotizacionConvertidaOperativa_(payload));
    }

    return jsonOperativo_({
      ok: false,
      error: "ACCION_NO_SOPORTADA",
      mensaje: "Acción POST no soportada: " + action,
    });
  } catch (error) {
    return jsonErrorOperativo_(error);
  }
}

/* =========================================================
 * VENTAS
 * ======================================================= */

function registrarVentaOperativa_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ventaId = String(payload.ventaId || "").trim();
    if (!ventaId) throw new Error("VENTA_ID_REQUERIDO");

    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) throw new Error("VENTA_SIN_ITEMS");

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

      if (!codigo) throw new Error("ITEM_SIN_CODIGO");
      if (!Number.isFinite(unidades) || unidades <= 0) {
        throw new Error("UNIDADES_INVALIDAS:" + codigo);
      }

      const inv = inventario[codigo];
      if (!inv) throw new Error("PRODUCTO_SIN_INVENTARIO:" + codigo);

      const stockAnterior = Number(inv.stockActual || 0);
      const stockNuevo = stockAnterior - unidades;
      if (stockNuevo < 0) throw new Error("STOCK_INSUFICIENTE:" + producto);

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

    getSheetOperativa_(CRM_BASE_SHEETS.VENTAS).appendRow([
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
    if (!ventaId) throw new Error("VENTA_ID_REQUERIDO");

    const venta = buscarVentaOperativa_(ventaId);
    if (!venta) throw new Error("VENTA_NO_ENCONTRADA");

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

/* =========================================================
 * COTIZACIONES
 * Una cotización NO modifica inventario.
 * ======================================================= */

function crearCotizacionOperativa_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const clientId = getClientIdOperativo_();
    const cliente = payload.cliente || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const requestId = String(payload.requestId || payload.numero || "").trim();

    if (!String(cliente.nombre || "").trim()) throw new Error("CLIENTE_REQUERIDO");
    if (!String(cliente.email || "").trim()) throw new Error("EMAIL_REQUERIDO");
    if (!items.length) throw new Error("COTIZACION_SIN_ITEMS");

    if (requestId) {
      const existentePorRequest = buscarCotizacionPorRequestIdOperativa_(requestId);
      if (existentePorRequest) {
        return {
          ok: true,
          data: Object.assign({}, existentePorRequest, {
            duplicada: true,
            mensaje: "La cotización ya estaba registrada. No se duplicó.",
          }),
        };
      }
    }

    const now = new Date();
    const numero = requestId || generarNumeroCotizacionOperativa_(now);
    const existente = buscarCotizacionOperativa_(numero);

    if (existente) {
      return {
        ok: true,
        data: Object.assign({}, existente, {
          duplicada: true,
          mensaje: "La cotización ya estaba registrada. No se duplicó.",
        }),
      };
    }

    let subtotal = 0;
    items.forEach(function(item) {
      const cantidad = Number(item.cantidad || 0);
      const precioUnitario = Number(item.precioUnitario || 0);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error("CANTIDAD_COTIZACION_INVALIDA");
      }
      if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
        throw new Error("PRECIO_COTIZACION_INVALIDO");
      }
      subtotal += cantidad * precioUnitario;
    });

    const descuento = Math.max(0, Math.min(Number(payload.descuento || 0), subtotal));
    const total = Math.max(0, subtotal - descuento);
    const neto = total / 1.19;
    const iva = total - neto;

    const documento = generarDocumentoCotizacionOperativa_({
      numero: numero,
      fecha: now,
      cliente: cliente,
      items: items,
      descuento: descuento,
      total: total,
      neto: neto,
      iva: iva,
      formaPago: String(payload.formaPago || "Pendiente"),
      observaciones: String(payload.observaciones || ""),
    });

    let estado = "GENERADA";
    let mensaje = "Cotización generada correctamente.";

    if (documento.pdfFile && String(cliente.email || "").trim()) {
      try {
        enviarCotizacionPorCorreoOperativa_({
          numero: numero,
          email: String(cliente.email || "").trim(),
          cliente: String(cliente.nombre || "Cliente"),
          pdfFile: documento.pdfFile,
        });
        estado = "ENVIADA";
        mensaje = "Cotización generada y enviada correctamente.";
      } catch (emailError) {
        console.error("No fue posible enviar cotización por correo", emailError);
        mensaje = "Cotización generada. No fue posible enviar el correo automáticamente.";
      }
    }

    getSheetOperativa_(CRM_BASE_SHEETS.COTIZACIONES).appendRow([
      clientId,
      requestId || numero,
      numero,
      now,
      estado,
      String(cliente.nombre || ""),
      String(cliente.empresa || ""),
      String(cliente.email || ""),
      String(cliente.telefono || ""),
      String(cliente.direccion || ""),
      String(payload.formaPago || "Pendiente"),
      descuento,
      neto,
      iva,
      total,
      documento.pdfUrl || "",
      documento.documentoUrl || "",
      String(payload.observaciones || ""),
      JSON.stringify(payload),
      "",
      "",
      now,
      now,
    ]);

    const itemsSheet = getSheetOperativa_(CRM_BASE_SHEETS.COTIZACIONES_ITEMS);
    items.forEach(function(item) {
      const cantidad = Number(item.cantidad || 0);
      const precioUnitario = Number(item.precioUnitario || 0);
      itemsSheet.appendRow([
        clientId,
        numero,
        String(item.sku || ""),
        String(item.producto || ""),
        String(item.formato || ""),
        cantidad,
        precioUnitario,
        cantidad * precioUnitario,
        now,
      ]);
    });

    return {
      ok: true,
      data: {
        numero: numero,
        estado: estado,
        total: total,
        pdfUrl: documento.pdfUrl || undefined,
        documentoUrl: documento.documentoUrl || undefined,
        duplicada: false,
        mensaje: mensaje,
      },
    };
  } finally {
    lock.releaseLock();
  }
}

function listarCotizacionesOperativas_() {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.COTIZACIONES);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  return values.slice(1)
    .filter(function(row) {
      return String(row[header.CLIENT_ID] || "") === clientId;
    })
    .map(function(row, index) {
      return filaCotizacionAObjetoOperativo_(row, header, index + 2);
    })
    .sort(function(a, b) {
      return new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime();
    });
}

function buscarCotizacionOperativa_(numero) {
  const buscado = String(numero || "").trim().toUpperCase();
  if (!buscado) return null;

  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.COTIZACIONES);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  for (var i = 1; i < values.length; i += 1) {
    const row = values[i];
    if (
      String(row[header.CLIENT_ID] || "") === clientId &&
      String(row[header.NUMERO] || "").trim().toUpperCase() === buscado
    ) {
      return filaCotizacionAObjetoOperativo_(row, header, i + 1);
    }
  }

  return null;
}

function buscarCotizacionPorRequestIdOperativa_(requestId) {
  const buscado = String(requestId || "").trim();
  if (!buscado) return null;

  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.COTIZACIONES);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  for (var i = 1; i < values.length; i += 1) {
    const row = values[i];
    if (
      String(row[header.CLIENT_ID] || "") === clientId &&
      String(row[header.REQUEST_ID] || "") === buscado
    ) {
      return filaCotizacionAObjetoOperativo_(row, header, i + 1);
    }
  }

  return null;
}

function filaCotizacionAObjetoOperativo_(row, header, rowNumber) {
  const numero = String(row[header.NUMERO] || "");
  return {
    fila: rowNumber,
    fecha: toIsoOperativo_(row[header.FECHA]),
    numero: numero,
    estado: String(row[header.ESTADO] || "GENERADA"),
    cliente: String(row[header.CLIENTE] || ""),
    empresa: String(row[header.EMPRESA] || ""),
    email: String(row[header.EMAIL] || ""),
    telefono: String(row[header.TELEFONO] || ""),
    direccion: String(row[header.DIRECCION] || ""),
    formaPago: String(row[header.FORMA_PAGO] || ""),
    descuento: Number(row[header.DESCUENTO] || 0),
    neto: Number(row[header.NETO] || 0),
    iva: Number(row[header.IVA] || 0),
    total: Number(row[header.TOTAL] || 0),
    pdfUrl: String(row[header.PDF_URL] || ""),
    documentoUrl: String(row[header.DOCUMENTO_URL] || ""),
    observaciones: String(row[header.OBSERVACIONES] || ""),
    ventaId: String(row[header.VENTA_ID] || ""),
    fechaConversion: row[header.FECHA_CONVERSION]
      ? toIsoOperativo_(row[header.FECHA_CONVERSION])
      : undefined,
    items: obtenerItemsCotizacionOperativa_(numero),
  };
}

function obtenerItemsCotizacionOperativa_(numero) {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.COTIZACIONES_ITEMS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  return values.slice(1)
    .filter(function(row) {
      return (
        String(row[header.CLIENT_ID] || "") === clientId &&
        String(row[header.NUMERO] || "") === numero
      );
    })
    .map(function(row) {
      return {
        sku: String(row[header.SKU] || ""),
        producto: String(row[header.PRODUCTO] || ""),
        formato: String(row[header.FORMATO] || ""),
        cantidad: Number(row[header.CANTIDAD] || 0),
        precioUnitario: Number(row[header.PRECIO_UNITARIO] || 0),
      };
    });
}

function marcarCotizacionConvertidaOperativa_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const numero = String(payload.numero || "").trim().toUpperCase();
    const ventaId = String(payload.ventaId || "").trim();

    if (!numero) throw new Error("SIN_NUMERO");
    if (!ventaId) throw new Error("SIN_VENTA_ID");

    const cotizacion = buscarCotizacionOperativa_(numero);
    if (!cotizacion) throw new Error("COTIZACION_NO_ENCONTRADA");

    if (cotizacion.estado === "CONVERTIDA") {
      return {
        ok: true,
        data: {
          numero: numero,
          estado: "CONVERTIDA",
          ventaId: cotizacion.ventaId || ventaId,
          fechaConversion: cotizacion.fechaConversion,
          duplicada: true,
        },
      };
    }

    const sheet = getSheetOperativa_(CRM_BASE_SHEETS.COTIZACIONES);
    const header = headerMapOperativo_(
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0],
    );
    const now = new Date();

    sheet.getRange(cotizacion.fila, header.ESTADO + 1).setValue("CONVERTIDA");
    sheet.getRange(cotizacion.fila, header.VENTA_ID + 1).setValue(ventaId);
    sheet.getRange(cotizacion.fila, header.FECHA_CONVERSION + 1).setValue(now);
    sheet.getRange(cotizacion.fila, header.UPDATED_AT + 1).setValue(now);

    return {
      ok: true,
      data: {
        numero: numero,
        estado: "CONVERTIDA",
        ventaId: ventaId,
        fechaConversion: now.toISOString(),
        duplicada: false,
      },
    };
  } finally {
    lock.releaseLock();
  }
}

function generarNumeroCotizacionOperativa_(now) {
  const zone = Session.getScriptTimeZone() || "America/Santiago";
  const stamp = Utilities.formatDate(now, zone, "yyyyMMdd-HHmmss");
  const suffix = Utilities.getUuid().slice(0, 6).toUpperCase();
  return "COT-" + stamp + "-" + suffix;
}

function generarDocumentoCotizacionOperativa_(data) {
  try {
    const company = obtenerEmpresaInstaladaOperativa_();
    const companyName = String(company.name || company.legalName || "Empresa");
    const doc = DocumentApp.create("Cotización " + data.numero + " - " + companyName);
    const body = doc.getBody();

    body.appendParagraph(companyName.toUpperCase())
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph("COTIZACIÓN " + data.numero)
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph("Fecha: " + Utilities.formatDate(data.fecha, Session.getScriptTimeZone() || "America/Santiago", "dd-MM-yyyy HH:mm"));

    const datosEmpresa = [
      company.legalName,
      company.rut ? "RUT: " + company.rut : "",
      company.email ? "Email: " + company.email : "",
      company.phone ? "Tel: " + company.phone : "",
      company.website ? "Web: " + company.website : "",
    ].filter(String).join(" · ");
    if (datosEmpresa) body.appendParagraph(datosEmpresa);

    body.appendParagraph("Cliente")
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph([
      data.cliente.nombre,
      data.cliente.empresa,
      data.cliente.email,
      data.cliente.telefono,
      data.cliente.direccion,
    ].filter(String).join(" · "));

    const tableData = [["Producto", "Formato", "Cantidad", "P. unitario", "Subtotal"]];
    data.items.forEach(function(item) {
      const cantidad = Number(item.cantidad || 0);
      const precio = Number(item.precioUnitario || 0);
      tableData.push([
        String(item.producto || ""),
        String(item.formato || ""),
        formatNumeroOperativo_(cantidad),
        formatClpOperativo_(precio),
        formatClpOperativo_(cantidad * precio),
      ]);
    });
    body.appendTable(tableData);

    body.appendParagraph("Subtotal: " + formatClpOperativo_(data.total + data.descuento));
    if (data.descuento > 0) body.appendParagraph("Descuento: -" + formatClpOperativo_(data.descuento));
    body.appendParagraph("TOTAL: " + formatClpOperativo_(data.total)).setBold(true);
    body.appendParagraph("Forma de pago: " + String(data.formaPago || "Pendiente"));
    if (data.observaciones) body.appendParagraph("Observaciones: " + data.observaciones);
    body.appendParagraph("Esta cotización no descuenta ni reserva stock hasta convertirse en venta.");

    doc.saveAndClose();

    const folder = getCotizacionesFolderOperativo_();
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(folder);

    const pdfBlob = docFile.getBlob().getAs(MimeType.PDF).setName("Cotizacion-" + data.numero + ".pdf");
    const pdfFile = folder.createFile(pdfBlob);

    return {
      documentoUrl: doc.getUrl(),
      pdfUrl: pdfFile.getUrl(),
      pdfFile: pdfFile,
    };
  } catch (error) {
    console.error("Error generando documento de cotización", error);
    return {
      documentoUrl: "",
      pdfUrl: "",
      pdfFile: null,
    };
  }
}

function enviarCotizacionPorCorreoOperativa_(data) {
  const company = obtenerEmpresaInstaladaOperativa_();
  const companyName = String(company.name || company.legalName || "Empresa");

  MailApp.sendEmail({
    to: data.email,
    subject: "Cotización " + data.numero + " - " + companyName,
    body:
      "Hola " + data.cliente + ",\n\n" +
      "Adjuntamos la cotización " + data.numero + ".\n\n" +
      "Saludos,\n" + companyName,
    attachments: [data.pdfFile.getBlob()],
    name: companyName,
  });
}

function getCotizacionesFolderOperativo_() {
  const explicit = PropertiesService.getScriptProperties().getProperty("QUOTES_FOLDER_ID");
  if (explicit && String(explicit).trim()) {
    return DriveApp.getFolderById(String(explicit).trim());
  }

  const operationalId = getRequiredPropertyOperativo_("OPERATIONAL_SPREADSHEET_ID");
  const parents = DriveApp.getFileById(operationalId).getParents();
  return parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
}

function obtenerEmpresaInstaladaOperativa_() {
  try {
    const rows = getInstallerRowsOperativo_("CLIENT_CONFIG");
    const clientId = getClientIdOperativo_();
    const row = rows.find(function(item) {
      return String(item.CLIENT_ID || "") === clientId;
    });

    if (row) {
      const raw = String(row.CONFIG_JSON || "").trim();
      if (raw) {
        const config = JSON.parse(raw);
        if (config && config.company) return config.company;
      }
    }
  } catch (error) {
    console.error("No fue posible leer empresa instalada", error);
  }

  return { name: getClientIdOperativo_() };
}

/* =========================================================
 * ESTRUCTURA / LECTURA
 * ======================================================= */

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
    if (!codigo || existing[codigo]) return;

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
  if (values.length <= 1) return [];

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  return values.slice(1)
    .filter(function(row) {
      return String(row[header.CLIENT_ID] || "") === clientId;
    })
    .map(function(row) {
      const ventaId = String(row[header.VENTA_ID] || "");
      return {
        ventaId: ventaId,
        fecha: toIsoOperativo_(row[header.FECHA]),
        cliente: String(row[header.CLIENTE] || "Sin cliente"),
        telefono: String(row[header.TELEFONO] || ""),
        formaPago: String(row[header.FORMA_PAGO] || ""),
        observacion: String(row[header.OBSERVACION] || ""),
        estado: String(row[header.ESTADO] || "ACTIVA"),
        total: Number(row[header.TOTAL] || 0),
        items: obtenerItemsVentaOperativa_(ventaId),
      };
    });
}

function obtenerProductosInstalador_() {
  const rows = getInstallerRowsOperativo_("CLIENT_PRODUCTS");
  const clientId = getClientIdOperativo_();

  return rows
    .filter(function(row) { return String(row.CLIENT_ID || "") === clientId; })
    .map(function(row) {
      const raw = String(row.PRODUCT_JSON || "").trim();
      if (raw) {
        try { return JSON.parse(raw); } catch (error) {}
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
    .filter(function(row) { return String(row.CLIENT_ID || "") === clientId; })
    .map(function(row) {
      const raw = String(row.CUSTOMER_JSON || "").trim();
      if (raw) {
        try { return JSON.parse(raw); } catch (error) {}
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
  if (!sheet) throw new Error("HOJA_INSTALADOR_NO_ENCONTRADA:" + sheetName);

  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];

  const headers = values[0].map(function(value) {
    return String(value || "").trim();
  });

  return values.slice(1).map(function(row) {
    const out = {};
    headers.forEach(function(header, index) { out[header] = row[index]; });
    return out;
  });
}

/* =========================================================
 * INVENTARIO / VENTAS HELPERS
 * ======================================================= */

function obtenerInventarioMapOperativo_() {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.INVENTARIO);
  const values = sheet.getDataRange().getValues();
  const map = {};
  if (values.length <= 1) return map;

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  values.slice(1).forEach(function(row, index) {
    if (String(row[header.CLIENT_ID] || "") !== clientId) return;
    const codigo = String(row[header.CODIGO] || "").trim();
    if (!codigo) return;

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
  const inv = obtenerInventarioMapOperativo_()[codigo];
  if (!inv) throw new Error("PRODUCTO_SIN_INVENTARIO:" + codigo);

  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.INVENTARIO);
  const header = headerMapOperativo_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  sheet.getRange(inv.rowNumber, header.STOCK_ACTUAL + 1).setValue(stockNuevo);
  sheet.getRange(inv.rowNumber, header.UPDATED_AT + 1).setValue(now);
}

function registrarMovimientoOperativo_(mov) {
  getSheetOperativa_(CRM_BASE_SHEETS.MOVIMIENTOS).appendRow([
    getClientIdOperativo_(), mov.movimientoId, mov.fecha, mov.tipo, mov.ventaId,
    mov.codigo, mov.producto, mov.unidades, mov.stockAnterior, mov.stockNuevo,
    mov.observacion || "",
  ]);
}

function buscarVentaOperativa_(ventaId) {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.VENTAS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  for (var i = 1; i < values.length; i += 1) {
    const row = values[i];
    if (
      String(row[header.CLIENT_ID] || "") === clientId &&
      String(row[header.VENTA_ID] || "") === ventaId
    ) {
      return { rowNumber: i + 1, estado: String(row[header.ESTADO] || "ACTIVA") };
    }
  }
  return null;
}

function marcarVentaAnuladaOperativa_(ventaId, now) {
  const venta = buscarVentaOperativa_(ventaId);
  if (!venta) throw new Error("VENTA_NO_ENCONTRADA");

  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.VENTAS);
  const header = headerMapOperativo_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  sheet.getRange(venta.rowNumber, header.ESTADO + 1).setValue("ANULADA");
  sheet.getRange(venta.rowNumber, header.UPDATED_AT + 1).setValue(now);
}

function obtenerItemsVentaOperativa_(ventaId) {
  const sheet = getSheetOperativa_(CRM_BASE_SHEETS.ITEMS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const header = headerMapOperativo_(values[0]);
  const clientId = getClientIdOperativo_();

  return values.slice(1)
    .filter(function(row) {
      return String(row[header.CLIENT_ID] || "") === clientId &&
        String(row[header.VENTA_ID] || "") === ventaId;
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

/* =========================================================
 * BASE HELPERS
 * ======================================================= */

function validarTokenOperativo_(tokenRecibido) {
  const esperado = String(getRequiredPropertyOperativo_("CRM_API_TOKEN") || "").trim();
  const recibido = String(tokenRecibido || "").trim();
  if (!recibido || recibido !== esperado) throw new Error("Token CRM inválido.");
  return true;
}

function getClientIdOperativo_() {
  return getRequiredPropertyOperativo_("CLIENT_ID");
}

function getRequiredPropertyOperativo_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value || !String(value).trim()) {
    throw new Error(name + " no configurado en Script Properties.");
  }
  return String(value).trim();
}

function getOperationalSpreadsheetOperativo_() {
  const explicitId = PropertiesService.getScriptProperties().getProperty("OPERATIONAL_SPREADSHEET_ID");
  if (explicitId && String(explicitId).trim()) {
    return SpreadsheetApp.openById(String(explicitId).trim());
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("OPERATIONAL_SPREADSHEET_ID no configurado.");
  return active;
}

function getOrCreateSheetOperativa_(sheetName) {
  const book = getOperationalSpreadsheetOperativo_();
  return book.getSheetByName(sheetName) || book.insertSheet(sheetName);
}

function getSheetOperativa_(sheetName) {
  const sheet = getOperationalSpreadsheetOperativo_().getSheetByName(sheetName);
  if (!sheet) throw new Error("HOJA_OPERATIVA_NO_ENCONTRADA:" + sheetName);
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
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  try { return JSON.parse(raw); }
  catch (error) { throw new Error("PAYLOAD_JSON_INVALIDO"); }
}

function toIsoOperativo_(value) {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function formatClpOperativo_(value) {
  return "$" + Math.round(Number(value || 0)).toLocaleString("es-CL");
}

function formatNumeroOperativo_(value) {
  return Number(value || 0).toLocaleString("es-CL", { maximumFractionDigits: 2 });
}

function jsonErrorOperativo_(error) {
  return jsonOperativo_({
    ok: false,
    error: error && error.message ? error.message : String(error),
    mensaje: error && error.message ? error.message : String(error),
  });
}

function jsonOperativo_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
