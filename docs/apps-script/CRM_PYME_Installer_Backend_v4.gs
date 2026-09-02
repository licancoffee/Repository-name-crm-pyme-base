/**
 * CRM PyME Base - Backend del instalador automático
 *
 * ACCIONES:
 * - guardarConfiguracionCliente
 * - obtenerConfiguracionCliente
 * - verificarInstalacion
 * - guardarProductosCliente
 * - obtenerProductosCliente
 * - guardarClientesCliente
 * - obtenerClientesCliente
 * - guardarConexionCliente
 * - obtenerConexionCliente
 *
 * Script Properties:
 * - SETUP_STORAGE_TOKEN
 * - SETUP_SPREADSHEET_ID
 */

const CONFIG_SHEET_NAME = "CLIENT_CONFIG";
const PRODUCTS_SHEET_NAME = "CLIENT_PRODUCTS";
const CUSTOMERS_SHEET_NAME = "CLIENT_CUSTOMERS";
const CONNECTIONS_SHEET_NAME = "CLIENT_CONNECTIONS";

const CONFIG_HEADERS = [
  "CLIENT_ID",
  "RUT",
  "EMPRESA",
  "RAZON_SOCIAL",
  "EMAIL",
  "ESTADO",
  "SETUP_VERSION",
  "CONFIG_JSON",
  "CREATED_AT",
  "UPDATED_AT",
];

const PRODUCT_HEADERS = [
  "CLIENT_ID",
  "PRODUCT_ID",
  "NOMBRE",
  "CATEGORIA",
  "UNIDAD_STOCK",
  "KG_POR_UNIDAD",
  "COSTO_NETO",
  "STOCK",
  "STOCK_MINIMO",
  "FORMATO_DEFAULT",
  "PRECIO_DEFAULT",
  "PRODUCT_JSON",
  "CREATED_AT",
  "UPDATED_AT",
];

const CUSTOMER_HEADERS = [
  "CLIENT_ID",
  "CUSTOMER_ID",
  "NOMBRE",
  "TELEFONO",
  "DIRECCION",
  "TIPO_PRECIO",
  "OBSERVACION",
  "CUSTOMER_JSON",
  "CREATED_AT",
  "UPDATED_AT",
];

const CONNECTION_HEADERS = [
  "CLIENT_ID",
  "ERP_APPS_SCRIPT_URL",
  "CRM_API_TOKEN",
  "STATUS",
  "CREATED_AT",
  "UPDATED_AT",
  "LAST_VERIFIED_AT",
  "NOTES",
];

function doGet(e) {
  try {
    const action = String(
      e && e.parameter && e.parameter.action
        ? e.parameter.action
        : "health",
    ).trim();

    if (action === "health") {
      return jsonResponse_({
        ok: true,
        service: "crm-pyme-installer",
        status: "ready",
        timestamp: new Date().toISOString(),
      });
    }

    const token = String(
      e.parameter.token || "",
    );

    validateToken_(token);

    const clientId = String(
      e.parameter.clientId || "",
    ).trim();

    if (!clientId) {
      return jsonResponse_({
        ok: false,
        message: "CLIENT_ID requerido.",
      });
    }

    if (
      action ===
      "obtenerConfiguracionCliente"
    ) {
      const record =
        getClientConfigById_(clientId);

      if (!record) {
        return jsonResponse_({
          ok: false,
          message:
            "No existe configuración para ese cliente.",
        });
      }

      return jsonResponse_({
        ok: true,
        clientId: record.clientId,
        config: record.config,
        status: record.status,
        updatedAt: record.updatedAt,
      });
    }

    if (
      action ===
      "obtenerProductosCliente"
    ) {
      const products =
        getProductsByClientId_(clientId);

      return jsonResponse_({
        ok: true,
        clientId,
        products,
        count: products.length,
      });
    }

    if (
      action ===
      "obtenerClientesCliente"
    ) {
      const customers =
        getCustomersByClientId_(clientId);

      return jsonResponse_({
        ok: true,
        clientId,
        customers,
        count: customers.length,
      });
    }

    if (
      action ===
      "obtenerConexionCliente"
    ) {
      const connection =
        getConnectionByClientId_(clientId);

      if (!connection) {
        return jsonResponse_({
          ok: true,
          clientId,
          configured: false,
          connection: null,
        });
      }

      return jsonResponse_({
        ok: true,
        clientId,
        configured: true,
        connection: {
          url: connection.url,
          token: connection.token,
        },
        status: connection.status,
        updatedAt: connection.updatedAt,
        lastVerifiedAt:
          connection.lastVerifiedAt,
      });
    }

    return jsonResponse_({
      ok: false,
      message:
        "Acción GET no soportada.",
    });
  } catch (error) {
    return jsonError_(error);
  }
}

function doPost(e) {
  try {
    const body =
      parseJsonBody_(e);

    const action =
      String(body.action || "").trim();

    const token =
      String(body.token || "");

    validateToken_(token);

    switch (action) {
      case "guardarConfiguracionCliente":
        return handleSaveClientConfig_(body);

      case "obtenerConfiguracionCliente":
        return handleGetClientConfig_(body);

      case "verificarInstalacion":
        return handleVerifyInstallation_(body);

      case "guardarProductosCliente":
        return handleSaveProducts_(body);

      case "obtenerProductosCliente":
        return handleGetProducts_(body);

      case "guardarClientesCliente":
        return handleSaveCustomers_(body);

      case "obtenerClientesCliente":
        return handleGetCustomers_(body);

      case "guardarConexionCliente":
        return handleSaveConnection_(body);

      case "obtenerConexionCliente":
        return handleGetConnection_(body);

      default:
        return jsonResponse_({
          ok: false,
          message:
            "Acción no reconocida.",
        });
    }
  } catch (error) {
    return jsonError_(error);
  }
}

function handleSaveClientConfig_(body) {
  const config =
    body && body.config
      ? body.config
      : null;

  if (
    !config ||
    typeof config !== "object"
  ) {
    return jsonResponse_({
      ok: false,
      message:
        "La configuración del cliente es obligatoria.",
    });
  }

  const company =
    config.company || {};

  const name =
    String(company.name || "").trim();

  const legalName =
    String(
      company.legalName || "",
    ).trim();

  const rut =
    String(company.rut || "").trim();

  const email =
    String(
      company.email || "",
    ).trim();

  if (!name) {
    return jsonResponse_({
      ok: false,
      message:
        "El nombre comercial es obligatorio.",
    });
  }

  if (!rut) {
    return jsonResponse_({
      ok: false,
      message:
        "El RUT es obligatorio.",
    });
  }

  const clientId =
    buildClientId_(rut, name);

  const sheet =
    getConfigSheet_();

  const now =
    new Date().toISOString();

  const existingRow =
    findClientRow_(
      sheet,
      clientId,
    );

  const configJson =
    JSON.stringify(config);

  const setupVersion =
    Number(
      config.setupVersion || 1,
    );

  const status =
    "CONFIGURADO";

  if (existingRow > 0) {
    const createdAt =
      String(
        sheet
          .getRange(
            existingRow,
            9,
          )
          .getValue() || now,
      );

    sheet
      .getRange(
        existingRow,
        1,
        1,
        CONFIG_HEADERS.length,
      )
      .setValues([[
        clientId,
        rut,
        name,
        legalName,
        email,
        status,
        setupVersion,
        configJson,
        createdAt,
        now,
      ]]);
  } else {
    sheet.appendRow([
      clientId,
      rut,
      name,
      legalName,
      email,
      status,
      setupVersion,
      configJson,
      now,
      now,
    ]);
  }

  return jsonResponse_({
    ok: true,
    message:
      "Configuración guardada correctamente.",
    clientId,
    status,
    updatedAt: now,
  });
}

function handleGetClientConfig_(body) {
  const clientId =
    String(
      body.clientId || "",
    ).trim();

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      message:
        "CLIENT_ID requerido.",
    });
  }

  const record =
    getClientConfigById_(clientId);

  if (!record) {
    return jsonResponse_({
      ok: false,
      message:
        "No existe configuración para ese cliente.",
    });
  }

  return jsonResponse_({
    ok: true,
    clientId: record.clientId,
    config: record.config,
    status: record.status,
    updatedAt: record.updatedAt,
  });
}

function handleVerifyInstallation_(body) {
  const clientId =
    String(
      body.clientId || "",
    ).trim();

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      installed: false,
      message:
        "CLIENT_ID requerido.",
    });
  }

  const record =
    getClientConfigById_(clientId);

  return jsonResponse_({
    ok: true,
    installed:
      Boolean(record),
    clientId,
    status:
      record
        ? record.status
        : "",
    updatedAt:
      record
        ? record.updatedAt
        : "",
  });
}

function handleSaveProducts_(body) {
  const clientId =
    String(
      body.clientId || "",
    ).trim();

  const products =
    Array.isArray(
      body.products,
    )
      ? body.products
      : [];

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      message:
        "CLIENT_ID requerido.",
    });
  }

  if (
    products.length === 0
  ) {
    return jsonResponse_({
      ok: false,
      message:
        "Debe existir al menos un producto.",
    });
  }

  requireClient_(clientId);

  const sheet =
    getProductsSheet_();

  deleteRowsByClientId_(
    sheet,
    clientId,
  );

  const now =
    new Date().toISOString();

  const rows =
    products.map(
      function (product) {
        const formats =
          Array.isArray(
            product.formats,
          )
            ? product.formats
            : [];

        const firstFormat =
          formats[0] || {};

        return [
          clientId,
          String(
            product.id || "",
          ),
          String(
            product.name || "",
          ),
          String(
            product.category || "",
          ),
          String(
            product.stockUnitLabel ||
              "",
          ),
          product.kgPerUnit ===
          undefined
            ? ""
            : Number(
                product.kgPerUnit,
              ),
          Number(
            product.netCost || 0,
          ),
          Number(
            product.stock || 0,
          ),
          Number(
            product.min || 0,
          ),
          String(
            product.format ||
              firstFormat.label ||
              "",
          ),
          Number(
            product.price ||
              firstFormat.price ||
              0,
          ),
          JSON.stringify(product),
          now,
          now,
        ];
      },
    );

  sheet
    .getRange(
      sheet.getLastRow() + 1,
      1,
      rows.length,
      PRODUCT_HEADERS.length,
    )
    .setValues(rows);

  return jsonResponse_({
    ok: true,
    message:
      "Productos guardados correctamente.",
    clientId,
    saved: rows.length,
    updatedAt: now,
  });
}

function handleGetProducts_(body) {
  const clientId =
    String(
      body.clientId || "",
    ).trim();

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      message:
        "CLIENT_ID requerido.",
    });
  }

  const products =
    getProductsByClientId_(clientId);

  return jsonResponse_({
    ok: true,
    clientId,
    products,
    count: products.length,
  });
}

function handleSaveCustomers_(body) {
  const clientId =
    String(
      body.clientId || "",
    ).trim();

  const customers =
    Array.isArray(
      body.customers,
    )
      ? body.customers
      : [];

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      message:
        "CLIENT_ID requerido.",
    });
  }

  if (
    customers.length === 0
  ) {
    return jsonResponse_({
      ok: false,
      message:
        "Debe existir al menos un cliente.",
    });
  }

  requireClient_(clientId);

  const sheet =
    getCustomersSheet_();

  deleteRowsByClientId_(
    sheet,
    clientId,
  );

  const now =
    new Date().toISOString();

  const rows =
    customers.map(
      function (customer) {
        return [
          clientId,
          String(
            customer.id || "",
          ),
          String(
            customer.name || "",
          ),
          String(
            customer.phone || "",
          ),
          String(
            customer.address || "",
          ),
          String(
            customer.priceType ||
              "LISTA",
          ),
          String(
            customer.note || "",
          ),
          JSON.stringify(customer),
          now,
          now,
        ];
      },
    );

  sheet
    .getRange(
      sheet.getLastRow() + 1,
      1,
      rows.length,
      CUSTOMER_HEADERS.length,
    )
    .setValues(rows);

  return jsonResponse_({
    ok: true,
    message:
      "Clientes guardados correctamente.",
    clientId,
    saved: rows.length,
    updatedAt: now,
  });
}

function handleGetCustomers_(body) {
  const clientId =
    String(
      body.clientId || "",
    ).trim();

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      message:
        "CLIENT_ID requerido.",
    });
  }

  const customers =
    getCustomersByClientId_(clientId);

  return jsonResponse_({
    ok: true,
    clientId,
    customers,
    count: customers.length,
  });
}

function handleSaveConnection_(body) {
  const clientId = String(
    body.clientId || "",
  ).trim();

  const connection =
    body && body.connection &&
    typeof body.connection === "object"
      ? body.connection
      : {};

  const url = String(
    connection.url || "",
  ).trim();

  const token = String(
    connection.token || "",
  ).trim();

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      message: "CLIENT_ID requerido.",
    });
  }

  if (!url) {
    return jsonResponse_({
      ok: false,
      message:
        "La URL operativa es obligatoria.",
    });
  }

  if (!token) {
    return jsonResponse_({
      ok: false,
      message:
        "El token operativo es obligatorio.",
    });
  }

  if (
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i.test(
      url,
    )
  ) {
    return jsonResponse_({
      ok: false,
      message:
        "La URL debe ser una implementación /exec de Google Apps Script.",
    });
  }

  requireClient_(clientId);

  const sheet =
    getConnectionsSheet_();

  const now =
    new Date().toISOString();

  const existingRow =
    findClientRow_(
      sheet,
      clientId,
    );

  let createdAt = now;

  if (existingRow > 0) {
    createdAt = String(
      sheet
        .getRange(
          existingRow,
          5,
        )
        .getValue() || now,
    );
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      connectionTokenPropertyKey_(
        clientId,
      ),
      token,
    );

  const row = [
    clientId,
    url,
    "[PROTEGIDO]",
    "CONFIGURADO",
    createdAt,
    now,
    now,
    "Conexión verificada por CRM Base antes de guardar.",
  ];

  if (existingRow > 0) {
    sheet
      .getRange(
        existingRow,
        1,
        1,
        CONNECTION_HEADERS.length,
      )
      .setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return jsonResponse_({
    ok: true,
    clientId,
    configured: true,
    status: "CONFIGURADO",
    updatedAt: now,
    message:
      "Conexión operativa guardada correctamente.",
  });
}

function handleGetConnection_(body) {
  const clientId = String(
    body.clientId || "",
  ).trim();

  if (!clientId) {
    return jsonResponse_({
      ok: false,
      message: "CLIENT_ID requerido.",
    });
  }

  const connection =
    getConnectionByClientId_(clientId);

  if (!connection) {
    return jsonResponse_({
      ok: true,
      clientId,
      configured: false,
      connection: null,
    });
  }

  return jsonResponse_({
    ok: true,
    clientId,
    configured: true,
    connection: {
      url: connection.url,
      token: connection.token,
    },
    status: connection.status,
    updatedAt: connection.updatedAt,
    lastVerifiedAt:
      connection.lastVerifiedAt,
  });
}

function getConnectionByClientId_(clientId) {
  const sheet =
    getConnectionsSheet_();

  const row =
    findClientRow_(
      sheet,
      clientId,
    );

  if (row < 1) {
    return null;
  }

  const values =
    sheet
      .getRange(
        row,
        1,
        1,
        CONNECTION_HEADERS.length,
      )
      .getValues()[0];

  const url = String(
    values[1] || "",
  ).trim();

  const token = String(
    PropertiesService
      .getScriptProperties()
      .getProperty(
        connectionTokenPropertyKey_(
          clientId,
        ),
      ) || "",
  ).trim();

  if (!url || !token) {
    return null;
  }

  return {
    clientId: String(
      values[0] || "",
    ),
    url,
    token,
    status: String(
      values[3] || "",
    ),
    createdAt: String(
      values[4] || "",
    ),
    updatedAt: String(
      values[5] || "",
    ),
    lastVerifiedAt: String(
      values[6] || "",
    ),
  };
}

function connectionTokenPropertyKey_(
  clientId,
) {
  return (
    "CLIENT_CONNECTION_TOKEN__" +
    normalizeIdPart_(clientId)
  );
}

function getClientConfigById_(clientId) {
  const sheet =
    getConfigSheet_();

  const row =
    findClientRow_(
      sheet,
      clientId,
    );

  if (row < 1) {
    return null;
  }

  const values =
    sheet
      .getRange(
        row,
        1,
        1,
        CONFIG_HEADERS.length,
      )
      .getValues()[0];

  let config = null;

  try {
    config =
      JSON.parse(
        String(
          values[7] || "{}",
        ),
      );
  } catch {
    throw new Error(
      "La configuración guardada contiene JSON inválido.",
    );
  }

  return {
    clientId:
      String(values[0] || ""),
    status:
      String(values[5] || ""),
    config,
    createdAt:
      String(values[8] || ""),
    updatedAt:
      String(values[9] || ""),
  };
}

function getProductsByClientId_(clientId) {
  return getJsonRowsByClientId_(
    getProductsSheet_(),
    clientId,
    12,
  );
}

function getCustomersByClientId_(clientId) {
  return getJsonRowsByClientId_(
    getCustomersSheet_(),
    clientId,
    8,
  );
}

function getJsonRowsByClientId_(
  sheet,
  clientId,
  jsonColumn,
) {
  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn(),
      )
      .getValues();

  const result = [];

  values.forEach(
    function (row) {
      if (
        String(
          row[0] || "",
        ).trim() !==
        clientId
      ) {
        return;
      }

      try {
        result.push(
          JSON.parse(
            String(
              row[
                jsonColumn - 1
              ] || "{}",
            ),
          ),
        );
      } catch {
        throw new Error(
          "Existe JSON inválido para el cliente " +
            clientId +
            ".",
        );
      }
    },
  );

  return result;
}

function requireClient_(clientId) {
  if (
    !getClientConfigById_(
      clientId,
    )
  ) {
    throw new Error(
      "El CLIENT_ID no existe en CLIENT_CONFIG.",
    );
  }
}

function deleteRowsByClientId_(
  sheet,
  clientId,
) {
  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  for (
    let row = lastRow;
    row >= 2;
    row -= 1
  ) {
    const current =
      String(
        sheet
          .getRange(
            row,
            1,
          )
          .getValue() || "",
      ).trim();

    if (
      current === clientId
    ) {
      sheet.deleteRow(row);
    }
  }
}

function getConfigSheet_() {
  return getOrCreateSheet_(
    CONFIG_SHEET_NAME,
    CONFIG_HEADERS,
  );
}

function getProductsSheet_() {
  return getOrCreateSheet_(
    PRODUCTS_SHEET_NAME,
    PRODUCT_HEADERS,
  );
}

function getCustomersSheet_() {
  return getOrCreateSheet_(
    CUSTOMERS_SHEET_NAME,
    CUSTOMER_HEADERS,
  );
}

function getConnectionsSheet_() {
  return getOrCreateSheet_(
    CONNECTIONS_SHEET_NAME,
    CONNECTION_HEADERS,
  );
}

function getOrCreateSheet_(
  name,
  headers,
) {
  const spreadsheet =
    getSetupSpreadsheet_();

  let sheet =
    spreadsheet.getSheetByName(
      name,
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        name,
      );
  }

  if (
    sheet.getLastRow() === 0
  ) {
    sheet
      .getRange(
        1,
        1,
        1,
        headers.length,
      )
      .setValues([headers]);

    sheet
      .getRange(
        1,
        1,
        1,
        headers.length,
      )
      .setFontWeight("bold");

    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getSetupSpreadsheet_() {
  const properties =
    PropertiesService
      .getScriptProperties();

  const spreadsheetId =
    String(
      properties
        .getProperty(
          "SETUP_SPREADSHEET_ID",
        ) || "",
    ).trim();

  if (!spreadsheetId) {
    throw new Error(
      "SETUP_SPREADSHEET_ID no está configurado.",
    );
  }

  return SpreadsheetApp
    .openById(spreadsheetId);
}

function findClientRow_(
  sheet,
  clientId,
) {
  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1,
      )
      .getValues();

  const target =
    String(clientId).trim();

  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    const current =
      String(
        values[index][0] || "",
      ).trim();

    if (current === target) {
      return index + 2;
    }
  }

  return -1;
}

function buildClientId_(
  rut,
  name,
) {
  const normalizedRut =
    normalizeIdPart_(rut);

  if (normalizedRut) {
    return "CL-" +
      normalizedRut;
  }

  return (
    "CLIENT-" +
    normalizeIdPart_(name) +
    "-" +
    Utilities
      .getUuid()
      .slice(0, 8)
      .toUpperCase()
  );
}

function normalizeIdPart_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      "",
    )
    .trim();
}

function validateToken_(token) {
  const expected =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          "SETUP_STORAGE_TOKEN",
        ) || "",
    );

  if (!expected) {
    throw new Error(
      "SETUP_STORAGE_TOKEN no está configurado en Script Properties.",
    );
  }

  if (
    !token ||
    token !== expected
  ) {
    throw new Error(
      "Token de instalación inválido.",
    );
  }
}

function parseJsonBody_(e) {
  if (
    !e ||
    !e.postData ||
    !e.postData.contents
  ) {
    throw new Error(
      "Solicitud sin contenido.",
    );
  }

  try {
    return JSON.parse(
      e.postData.contents,
    );
  } catch {
    throw new Error(
      "JSON de solicitud inválido.",
    );
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(
      JSON.stringify(payload),
    )
    .setMimeType(
      ContentService
        .MimeType
        .JSON,
    );
}

function jsonError_(error) {
  console.error(
    "[SETUP BACKEND ERROR]",
    error,
  );

  return jsonResponse_({
    ok: false,
    message:
      error instanceof Error
        ? error.message
        : String(error),
  });
}
