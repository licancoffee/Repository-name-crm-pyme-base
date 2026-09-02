const fs = require('fs');
const { execSync } = require('child_process');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value, 'utf8'); }
function mustReplace(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`No se encontró ${label}`);
  return source.replace(search, replacement);
}

const files = {
  setupRoute: 'src/routes/setup.tsx',
  setupApi: 'src/routes/api/setup.ts',
  setupStorage: 'src/lib/setup/storage.server.ts',
  productsRoute: 'src/routes/setup-productos.tsx',
  productsApi: 'src/routes/api/setup-products.ts',
  productsStorage: 'src/lib/setup/products-storage.server.ts',
  customersRoute: 'src/routes/setup-clientes.tsx',
  customersApi: 'src/routes/api/setup-customers.ts',
  customersStorage: 'src/lib/setup/customers-storage.server.ts',
};

let setupRoute = read(files.setupRoute);
let setupApi = read(files.setupApi);
let setupStorage = read(files.setupStorage);
let productsRoute = read(files.productsRoute);
let productsApi = read(files.productsApi);
let productsStorage = read(files.productsStorage);
let customersRoute = read(files.customersRoute);
let customersApi = read(files.customersApi);
let customersStorage = read(files.customersStorage);

// STEP 1 UI -> API: enviar config + clientId explícito en modo new.
setupRoute = mustReplace(
  setupRoute,
  'body:\n              JSON.stringify(\n                form,\n              ),',
  'body:\n              JSON.stringify({\n                config: form,\n                clientId:\n                  isNewInstallationMode()\n                    ? clientIdFromRut(form.company.rut)\n                    : undefined,\n              }),',
  'body de /api/setup en setup.tsx',
);

// API setup: aceptar envoltorio y clientId.
setupApi = mustReplace(
  setupApi,
  '      const validation =\n        validateSetupConfig(\n          body,\n        );',
  '      const requestedClientId =\n        typeof body?.clientId === "string"\n          ? body.clientId.trim()\n          : "";\n\n      const validation =\n        validateSetupConfig(\n          body?.config ?? body,\n        );',
  'validación de setup',
);
setupApi = mustReplace(
  setupApi,
  '        await saveSetupConfig(\n          validation.config,\n        );',
  '        await saveSetupConfig(\n          validation.config,\n          requestedClientId || undefined,\n        );',
  'saveSetupConfig',
);
setupApi = mustReplace(
  setupApi,
  '        config:\n          validation.config,',
  '        config:\n          validation.config,\n        clientId:\n          result.clientId || requestedClientId || undefined,',
  'respuesta setup clientId',
);

// Storage setup: aceptar override, enviarlo y validar respuesta.
setupStorage = setupStorage.replace(
  '  message: string;\n};',
  '  message: string;\n  clientId?: string;\n};',
);
setupStorage = setupStorage.replace(
  'export async function saveSetupConfig(\n  config: ClientConfig,\n): Promise<SetupStorageResult> {',
  'export async function saveSetupConfig(\n  config: ClientConfig,\n  clientId?: string,\n): Promise<SetupStorageResult> {',
);
setupStorage = setupStorage.replace(
  '          token,\n\n          config,',
  '          token,\n\n          clientId,\n\n          config,',
);
if (!setupStorage.includes('El backend guardó la configuración en otro CLIENT_ID.')) {
  setupStorage = setupStorage.replace(
    '  if (\n    result &&\n    result.ok === false\n  ) {',
    '  if (\n    result &&\n    result.ok === false\n  ) {',
  );
  const anchor = '  return {\n    ok: true,';
  const guard = `  const returnedClientId =\n    typeof result?.clientId === "string"\n      ? result.clientId\n      : "";\n\n  if (\n    clientId &&\n    returnedClientId &&\n    returnedClientId !== clientId\n  ) {\n    throw new Error(\n      "El backend guardó la configuración en otro CLIENT_ID.",\n    );\n  }\n\n`;
  if (!setupStorage.includes(anchor)) throw new Error('No se encontró return de storage.server.ts');
  setupStorage = setupStorage.replace(anchor, guard + anchor);
  setupStorage = setupStorage.replace(
    '    message:\n      typeof result?.message ===',
    '    clientId:\n      returnedClientId || clientId,\n    message:\n      typeof result?.message ===',
  );
}

// Helper clientId desde query en pasos 2 y 3.
const helper = `function getInstallationClientId() {\n  if (typeof window === "undefined") {\n    return "";\n  }\n\n  return new URLSearchParams(\n    window.location.search,\n  ).get("clientId")?.trim() || "";\n}\n\n`;

if (!productsRoute.includes('function getInstallationClientId()')) {
  productsRoute = productsRoute.replace('function SetupProductsPage() {', helper + 'function SetupProductsPage() {');
}
if (!customersRoute.includes('function getInstallationClientId()')) {
  customersRoute = customersRoute.replace('function SetupCustomersPage() {', helper + 'function SetupCustomersPage() {');
}

// Paso 2 UI: enviar clientId.
productsRoute = mustReplace(
  productsRoute,
  'JSON.stringify({\n                products:\n                  drafts,\n              }),',
  'JSON.stringify({\n                clientId:\n                  getInstallationClientId() || undefined,\n                products:\n                  drafts,\n              }),',
  'clientId en setup-productos',
);

// Paso 3 UI: enviar clientId.
customersRoute = mustReplace(
  customersRoute,
  'JSON.stringify({\n                customers:\n                  drafts,\n              }),',
  'JSON.stringify({\n                clientId:\n                  getInstallationClientId() || undefined,\n                customers:\n                  drafts,\n              }),',
  'clientId en setup-clientes',
);

// APIs pasos 2/3: pasar clientId al storage.
productsApi = mustReplace(
  productsApi,
  '      const result =\n        await saveSetupProducts(\n          validation.products,\n        );',
  '      const requestedClientId =\n        typeof body?.clientId === "string"\n          ? body.clientId.trim()\n          : "";\n\n      const result =\n        await saveSetupProducts(\n          validation.products,\n          requestedClientId || undefined,\n        );',
  'saveSetupProducts API',
);
customersApi = mustReplace(
  customersApi,
  '      const result =\n        await saveSetupCustomers(\n          validation.customers,\n        );',
  '      const requestedClientId =\n        typeof body?.clientId === "string"\n          ? body.clientId.trim()\n          : "";\n\n      const result =\n        await saveSetupCustomers(\n          validation.customers,\n          requestedClientId || undefined,\n        );',
  'saveSetupCustomers API',
);

// Storages pasos 2/3: usar override o env y validar aislamiento.
function patchEntityStorage(source, fnName, entityType, mismatchMessage) {
  source = source.replace(
    'function getStorageConfig() {',
    'function getStorageConfig(clientIdOverride?: string) {',
  );
  source = source.replace(
    '  const clientId =\n      process.env.CLIENT_ID;',
    '  const clientId =\n      clientIdOverride ||\n      process.env.CLIENT_ID;',
  );
  const sigOld = `export async function ${fnName}(\n    ${entityType},\n  ): Promise`;
  const sigNew = `export async function ${fnName}(\n    ${entityType},\n    clientIdOverride?: string,\n  ): Promise`;
  source = source.replace(sigOld, sigNew);
  source = source.replace(
    '      getStorageConfig();',
    '      getStorageConfig(clientIdOverride);',
  );
  if (!source.includes(mismatchMessage)) {
    const anchor = '  return {\n      ok: true,';
    const guard = `  const returnedClientId =\n    typeof result?.clientId === "string"\n      ? result.clientId\n      : "";\n\n  if (\n    returnedClientId &&\n    returnedClientId !== clientId\n  ) {\n    throw new Error(\n      "${mismatchMessage}",\n    );\n  }\n\n`;
    if (!source.includes(anchor)) throw new Error(`No se encontró return de ${fnName}`);
    source = source.replace(anchor, guard + anchor);
  }
  return source;
}

productsStorage = patchEntityStorage(
  productsStorage,
  'saveSetupProducts',
  'products: Product[]',
  'El backend guardó los productos en otro CLIENT_ID.',
);
customersStorage = patchEntityStorage(
  customersStorage,
  'saveSetupCustomers',
  'customers: Customer[]',
  'El backend guardó los clientes en otro CLIENT_ID.',
);

// Continuaciones: preservar clientId cuando exista.
if (!setupRoute.includes('setup-productos?clientId=')) {
  setupRoute = setupRoute.replace(
    /href="\/setup-productos"/g,
    'href={isNewInstallationMode() ? `/setup-productos?clientId=${clientIdFromRut(form.company.rut)}` : "/setup-productos"}',
  );
}
if (!productsRoute.includes('setup-clientes?clientId=')) {
  productsRoute = productsRoute.replace(
    /href="\/setup-clientes"/g,
    'href={getInstallationClientId() ? `/setup-clientes?clientId=${getInstallationClientId()}` : "/setup-clientes"}',
  );
}

write(files.setupRoute, setupRoute);
write(files.setupApi, setupApi);
write(files.setupStorage, setupStorage);
write(files.productsRoute, productsRoute);
write(files.productsApi, productsApi);
write(files.productsStorage, productsStorage);
write(files.customersRoute, customersRoute);
write(files.customersApi, customersApi);
write(files.customersStorage, customersStorage);

console.log('✓ CLIENT_ID nuevo viaja desde Empresa -> API -> backend');
console.log('✓ Productos usan el CLIENT_ID de la nueva instalación');
console.log('✓ Clientes usan el CLIENT_ID de la nueva instalación');
console.log('✓ Se valida que el backend no responda con otro CLIENT_ID');
console.log('✓ El CLIENT_ID actual del .env sigue siendo fallback para DULCEVILLARRICA');
console.log('✓ No se modificaron datos existentes');

try {
  execSync('git add src/routes/setup.tsx src/routes/api/setup.ts src/lib/setup/storage.server.ts src/routes/setup-productos.tsx src/routes/api/setup-products.ts src/lib/setup/products-storage.server.ts src/routes/setup-clientes.tsx src/routes/api/setup-customers.ts src/lib/setup/customers-storage.server.ts', { stdio: 'inherit' });
  execSync('git commit -m "Aisla CLIENT_ID durante nueva instalación"', { stdio: 'inherit' });
  execSync('git push origin respaldo-instalador-avanzado', { stdio: 'inherit' });
  console.log('✓ Cambios enviados a GitHub');
} catch {
  console.log('El cambio quedó aplicado localmente; revisa git status si el push no terminó.');
}
