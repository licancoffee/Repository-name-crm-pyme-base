const fs = require('fs');
const { execSync } = require('child_process');

const paths = {
  productsRoute: 'src/routes/setup-productos.tsx',
  customersRoute: 'src/routes/setup-clientes.tsx',
  productsApi: 'src/routes/api/setup-products.ts',
  customersApi: 'src/routes/api/setup-customers.ts',
  productsStorage: 'src/lib/setup/products-storage.server.ts',
  customersStorage: 'src/lib/setup/customers-storage.server.ts',
};

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value, 'utf8'); }
function fail(message) { throw new Error(message); }

function ensureClientIdHelper(source, componentName) {
  if (source.includes('function getInstallationClientId()')) return source;
  const marker = `function ${componentName}() {`;
  if (!source.includes(marker)) fail(`No se encontró ${componentName}`);
  const helper = `function getInstallationClientId() {\n  if (typeof window === "undefined") {\n    return "";\n  }\n\n  return (\n    new URLSearchParams(\n      window.location.search,\n    ).get("clientId")?.trim() || ""\n  );\n}\n\n`;
  return source.replace(marker, helper + marker);
}

function patchRoute(source, kind) {
  const component = kind === 'products' ? 'SetupProductsPage' : 'SetupCustomersPage';
  source = ensureClientIdHelper(source, component);

  const entity = kind === 'products' ? 'products' : 'customers';
  const oldBody = new RegExp(`JSON\\.stringify\\(\\{\\s*${entity}:\\s*drafts,?\\s*\\}\\)`, 'm');
  if (!source.includes('clientId:\n                  getInstallationClientId()')) {
    if (!oldBody.test(source)) fail(`No se encontró body de ${kind}`);
    source = source.replace(
      oldBody,
      `JSON.stringify({\n                clientId:\n                  getInstallationClientId() || undefined,\n                ${entity}:\n                  drafts,\n              })`,
    );
  }

  // Si estamos instalando otra empresa, no permitimos guardar sin clientId.
  const guardNeedle = '    setSaveState({\n      status: "saving",';
  if (!source.includes('Falta el CLIENT_ID de la nueva instalación.')) {
    if (!source.includes(guardNeedle)) fail(`No se encontró guardado de ${kind}`);
    const guard = `    if (\n      window.location.search.includes("clientId=") &&\n      !getInstallationClientId()\n    ) {\n      setSaveState({\n        status: "error",\n        message:\n          "Falta el CLIENT_ID de la nueva instalación.",\n      });\n      return;\n    }\n\n`;
    source = source.replace(guardNeedle, guard + guardNeedle);
  }

  // Verificación estricta de respuesta cuando la URL trae clientId.
  const successNeedle = '      setSavedCount(\n';
  if (!source.includes('El backend respondió con otro CLIENT_ID.')) {
    if (!source.includes(successNeedle)) fail(`No se encontró respuesta de ${kind}`);
    const verify = `      const requestedClientId =\n        getInstallationClientId();\n\n      if (\n        requestedClientId &&\n        data?.clientId !== requestedClientId\n      ) {\n        throw new Error(\n          "El backend respondió con otro CLIENT_ID.",\n        );\n      }\n\n`;
    source = source.replace(successNeedle, verify + successNeedle);
  }

  return source;
}

function patchApi(source, saveFn, entity) {
  if (!source.includes('const requestedClientId =')) {
    const validationMarker = `      const validation =\n`;
    if (!source.includes(validationMarker)) fail(`No se encontró validación API ${entity}`);
    const requested = `      const requestedClientId =\n        typeof body?.clientId === "string"\n          ? body.clientId.trim()\n          : "";\n\n`;
    source = source.replace(validationMarker, requested + validationMarker);
  }

  const oldCall = new RegExp(`await ${saveFn}\\(\\s*validation\\.${entity},\\s*\\);`, 'm');
  if (!source.includes('requestedClientId || undefined')) {
    if (!oldCall.test(source)) fail(`No se encontró llamada ${saveFn}`);
    source = source.replace(
      oldCall,
      `await ${saveFn}(\n          validation.${entity},\n          requestedClientId || undefined,\n        );`,
    );
  }
  return source;
}

function patchStorage(source, saveFn, entityType, mismatchMessage) {
  if (!source.includes('function getStorageConfig(clientIdOverride?: string)')) {
    source = source.replace(
      'function getStorageConfig() {',
      'function getStorageConfig(clientIdOverride?: string) {',
    );
    source = source.replace(
      '  const clientId =\n      process.env.CLIENT_ID;',
      '  const clientId =\n      clientIdOverride ||\n      process.env.CLIENT_ID;',
    );
  }

  const oldSig = `export async function ${saveFn}(\n    ${entityType},\n  )`;
  const newSig = `export async function ${saveFn}(\n    ${entityType},\n    clientIdOverride?: string,\n  )`;
  if (!source.includes('clientIdOverride?: string')) {
    if (!source.includes(oldSig)) fail(`No se encontró firma ${saveFn}`);
    source = source.replace(oldSig, newSig);
  }

  source = source.replace(
    '      getStorageConfig();',
    '      getStorageConfig(clientIdOverride);',
  );

  if (!source.includes(mismatchMessage)) {
    const returnMarker = '  return {\n      ok: true,';
    if (!source.includes(returnMarker)) fail(`No se encontró return ${saveFn}`);
    const guard = `  const returnedClientId =\n    typeof result?.clientId === "string"\n      ? result.clientId\n      : clientId;\n\n  if (returnedClientId !== clientId) {\n    throw new Error(\n      "${mismatchMessage}",\n    );\n  }\n\n`;
    source = source.replace(returnMarker, guard + returnMarker);
  }

  return source;
}

let productsRoute = patchRoute(read(paths.productsRoute), 'products');
let customersRoute = patchRoute(read(paths.customersRoute), 'customers');
let productsApi = patchApi(read(paths.productsApi), 'saveSetupProducts', 'products');
let customersApi = patchApi(read(paths.customersApi), 'saveSetupCustomers', 'customers');
let productsStorage = patchStorage(
  read(paths.productsStorage),
  'saveSetupProducts',
  'products: Product[]',
  'El backend guardó los productos en otro CLIENT_ID.',
);
let customersStorage = patchStorage(
  read(paths.customersStorage),
  'saveSetupCustomers',
  'customers: Customer[]',
  'El backend guardó los clientes en otro CLIENT_ID.',
);

write(paths.productsRoute, productsRoute);
write(paths.customersRoute, customersRoute);
write(paths.productsApi, productsApi);
write(paths.customersApi, customersApi);
write(paths.productsStorage, productsStorage);
write(paths.customersStorage, customersStorage);

console.log('✓ Productos envían y validan el clientId de la URL');
console.log('✓ Clientes envían y validan el clientId de la URL');
console.log('✓ APIs pasan el clientId al almacenamiento');
console.log('✓ Storage usa override multiempresa y conserva .env como fallback');
console.log('✓ Se rechaza cualquier respuesta con CLIENT_ID distinto');

try {
  execSync('git add src/routes/setup-productos.tsx src/routes/setup-clientes.tsx src/routes/api/setup-products.ts src/routes/api/setup-customers.ts src/lib/setup/products-storage.server.ts src/lib/setup/customers-storage.server.ts', { stdio: 'inherit' });
  execSync('git commit -m "Corrige aislamiento de productos y clientes"', { stdio: 'inherit' });
  execSync('git push origin respaldo-instalador-avanzado', { stdio: 'inherit' });
  console.log('✓ Corrección enviada a GitHub');
} catch {
  console.log('El cambio quedó aplicado localmente. Revisa git status si el push no terminó.');
}
