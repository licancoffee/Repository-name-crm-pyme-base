const fs = require('fs');
const { execSync } = require('child_process');

const routePath = 'src/routes/setup-clientes.tsx';
const apiPath = 'src/routes/api/setup-customers.ts';
const storagePath = 'src/lib/setup/customers-storage.server.ts';
const readPath = 'src/lib/setup/customers-read.server.ts';
const configPath = 'src/lib/setup/client-config.server.ts';
const contextApiPath = 'src/routes/api/setup-client-context.ts';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }
function fail(msg) { throw new Error(msg); }

let route = read(routePath);
let api = read(apiPath);
let storage = read(storagePath);
let customersRead = read(readPath);
let clientConfigServer = read(configPath);

// ---------- setup-clientes.tsx ----------
route = route.replace(
  /import \{\s*useMemo,\s*useState,\s*\} from "react";/,
  'import {\n  useEffect,\n  useMemo,\n  useState,\n} from "react";',
);

if (!route.includes('function getInstallationClientId()')) {
  const marker = 'function SetupCustomersPage() {';
  if (!route.includes(marker)) fail('No se encontró SetupCustomersPage');
  route = route.replace(marker, `function getInstallationClientId() {\n  if (typeof window === "undefined") {\n    return "";\n  }\n\n  return (\n    new URLSearchParams(\n      window.location.search,\n    ).get("clientId")?.trim() || ""\n  );\n}\n\n${marker}`);
}

if (!route.includes('const [\n    companyName,')) {
  const marker = 'function SetupCustomersPage() {\n';
  const state = `  const [\n    companyName,\n    setCompanyName,\n  ] = useState(\n    clientConfig.company.name,\n  );\n\n  const [\n    loadingExisting,\n    setLoadingExisting,\n  ] = useState(false);\n\n`;
  route = route.replace(marker, marker + state);
}

if (!route.includes('setup-client-context')) {
  const marker = '  const result =\n    useMemo(';
  if (!route.includes(marker)) fail('No se encontró useMemo result');
  const effect = `  useEffect(() => {\n    const clientId =\n      getInstallationClientId();\n\n    if (!clientId) {\n      return;\n    }\n\n    let cancelled = false;\n    setLoadingExisting(true);\n\n    fetch(\n      \`/api/setup-client-context?clientId=\${encodeURIComponent(clientId)}\`,\n      { cache: "no-store" },\n    )\n      .then(async (response) => {\n        const data =\n          await response.json();\n\n        if (!response.ok || data?.ok === false) {\n          throw new Error(\n            data?.message ||\n              "No fue posible cargar la instalación.",\n          );\n        }\n\n        if (\n          data?.clientId &&\n          data.clientId !== clientId\n        ) {\n          throw new Error(\n            "El backend respondió con otro CLIENT_ID.",\n          );\n        }\n\n        if (cancelled) return;\n\n        if (data?.companyName) {\n          setCompanyName(\n            String(data.companyName),\n          );\n        }\n\n        if (\n          Array.isArray(data?.customers) &&\n          data.customers.length > 0\n        ) {\n          setDrafts(\n            data.customers.map((customer) => ({\n              id:\n                customer.id ||\n                crypto.randomUUID(),\n              name:\n                customer.name || "",\n              phone:\n                customer.phone || "",\n              address:\n                customer.address || "",\n              note:\n                customer.note || "",\n              priceType:\n                customer.priceType ||\n                "LISTA",\n            })),\n          );\n        }\n      })\n      .catch((error) => {\n        if (cancelled) return;\n        setSaveState({\n          status: "error",\n          message:\n            error instanceof Error\n              ? error.message\n              : "No fue posible cargar los clientes guardados.",\n        });\n      })\n      .finally(() => {\n        if (!cancelled) {\n          setLoadingExisting(false);\n        }\n      });\n\n    return () => {\n      cancelled = true;\n    };\n  }, []);\n\n`;
  route = route.replace(marker, effect + marker);
}

// Guardado: incluir clientId.
if (!route.includes('clientId:\n                  getInstallationClientId()')) {
  route = route.replace(
    /JSON\.stringify\(\{\s*customers:\s*drafts,?\s*\}\)/m,
    'JSON.stringify({\n                clientId:\n                  getInstallationClientId() || undefined,\n                customers:\n                  drafts,\n              })',
  );
}

// Verificar clientId devuelto antes de marcar éxito.
if (!route.includes('La respuesta de guardado pertenece a otro CLIENT_ID.')) {
  const marker = '      setSavedCount(\n';
  if (!route.includes(marker)) fail('No se encontró setSavedCount');
  route = route.replace(marker, `      const requestedClientId =\n        getInstallationClientId();\n\n      if (\n        requestedClientId &&\n        data?.clientId !== requestedClientId\n      ) {\n        throw new Error(\n          "La respuesta de guardado pertenece a otro CLIENT_ID.",\n        );\n      }\n\n${marker}`);
}

route = route.replace(
  'Clientes de {clientConfig.company.name}',
  'Clientes de {companyName}',
);

// Mostrar estado de carga de datos existentes.
if (!route.includes('Cargando clientes guardados...')) {
  const marker = '<main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">';
  if (route.includes(marker)) {
    route = route.replace(marker, `${marker}\n        {loadingExisting && (\n          <div className="lg:col-span-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">\n            Cargando clientes guardados...\n          </div>\n        )}`);
  }
}

// ---------- api/setup-customers.ts ----------
if (!api.includes('const requestedClientId =')) {
  const marker = '      const drafts =\n';
  api = api.replace(marker, `      const requestedClientId =\n        typeof body?.clientId === "string"\n          ? body.clientId.trim()\n          : "";\n\n${marker}`);
}
api = api.replace(
  /await saveSetupCustomers\(\s*validation\.customers,\s*\);/m,
  'await saveSetupCustomers(\n          validation.customers,\n          requestedClientId || undefined,\n        );',
);

// ---------- customers-storage.server.ts ----------
storage = storage.replace(
  'function getStorageConfig() {',
  'function getStorageConfig(clientIdOverride?: string) {',
);
storage = storage.replace(
  '  const clientId =\n      process.env.CLIENT_ID;',
  '  const clientId =\n      clientIdOverride ||\n      process.env.CLIENT_ID;',
);
storage = storage.replace(
  'export async function saveSetupCustomers(\n    customers: Customer[],\n  ): Promise<CustomerStorageResult> {',
  'export async function saveSetupCustomers(\n    customers: Customer[],\n    clientIdOverride?: string,\n  ): Promise<CustomerStorageResult> {',
);
storage = storage.replace(
  '      getStorageConfig();',
  '      getStorageConfig(clientIdOverride);',
);

if (!storage.includes('Los clientes fueron guardados en otro CLIENT_ID.')) {
  const marker = '  return {\n      ok: true,';
  if (!storage.includes(marker)) fail('No se encontró return en customers storage');
  const guard = `  const returnedClientId =\n    typeof result?.clientId === "string"\n      ? result.clientId\n      : clientId;\n\n  if (returnedClientId !== clientId) {\n    throw new Error(\n      "Los clientes fueron guardados en otro CLIENT_ID.",\n    );\n  }\n\n`;
  storage = storage.replace(marker, guard + marker);
}

// ---------- customers-read.server.ts ----------
customersRead = customersRead.replace(
  'function getInstallerSettings() {',
  'function getInstallerSettings(clientIdOverride?: string) {',
);
customersRead = customersRead.replace(
  '  const clientId =\n    process.env.CLIENT_ID;',
  '  const clientId =\n    clientIdOverride ||\n    process.env.CLIENT_ID;',
);
customersRead = customersRead.replace(
  'export async function readInstalledCustomers() {',
  'export async function readInstalledCustomers(\n  clientIdOverride?: string,\n) {',
);
customersRead = customersRead.replace(
  '    getInstallerSettings();',
  '    getInstallerSettings(clientIdOverride);',
);

// ---------- client-config.server.ts ----------
clientConfigServer = clientConfigServer.replace(
  'function getRemoteConfigSettings() {',
  'function getRemoteConfigSettings(clientIdOverride?: string) {',
);
clientConfigServer = clientConfigServer.replace(
  '    const clientId =\n      process.env.CLIENT_ID;',
  '    const clientId =\n      clientIdOverride ||\n      process.env.CLIENT_ID;',
);
clientConfigServer = clientConfigServer.replace(
  'export async function loadRemoteClientConfig() {',
  'export async function loadRemoteClientConfig(\n    clientIdOverride?: string,\n  ) {',
);
clientConfigServer = clientConfigServer.replace(
  '      getRemoteConfigSettings();',
  '      getRemoteConfigSettings(clientIdOverride);',
);

// ---------- API de contexto del Paso 3 ----------
const contextApi = `import {\n  createFileRoute,\n} from "@tanstack/react-router";\n\nimport {\n  loadRemoteClientConfig,\n} from "@/lib/setup/client-config.server";\n\nimport {\n  readInstalledCustomers,\n} from "@/lib/setup/customers-read.server";\n\nfunction jsonResponse(\n  body: unknown,\n  status = 200,\n) {\n  return new Response(\n    JSON.stringify(body),\n    {\n      status,\n      headers: {\n        "Content-Type":\n          "application/json; charset=utf-8",\n        "Cache-Control":\n          "no-store",\n      },\n    },\n  );\n}\n\nasync function handleGet(\n  request: Request,\n) {\n  try {\n    const url =\n      new URL(request.url);\n\n    const clientId =\n      url.searchParams\n        .get("clientId")\n        ?.trim() || "";\n\n    if (!clientId) {\n      return jsonResponse(\n        {\n          ok: false,\n          message:\n            "Falta clientId.",\n        },\n        400,\n      );\n    }\n\n    const [configResult, customersResult] =\n      await Promise.all([\n        loadRemoteClientConfig(\n          clientId,\n        ),\n        readInstalledCustomers(\n          clientId,\n        ),\n      ]);\n\n    if (\n      configResult.clientId &&\n      configResult.clientId !== clientId\n    ) {\n      throw new Error(\n        "La configuración pertenece a otro CLIENT_ID.",\n      );\n    }\n\n    if (\n      customersResult.clientId !==\n      clientId\n    ) {\n      throw new Error(\n        "Los clientes pertenecen a otro CLIENT_ID.",\n      );\n    }\n\n    return jsonResponse({\n      ok: true,\n      clientId,\n      companyName:\n        configResult.config\n          ?.company?.name ||\n        clientId,\n      customers:\n        customersResult.customers,\n      count:\n        customersResult.count,\n    });\n  } catch (error) {\n    return jsonResponse(\n      {\n        ok: false,\n        message:\n          error instanceof Error\n            ? error.message\n            : "No fue posible cargar el contexto del cliente.",\n      },\n      500,\n    );\n  }\n}\n\nexport const Route =\n  createFileRoute(\n    "/api/setup-client-context",\n  )({\n    server: {\n      handlers: {\n        GET: ({ request }) =>\n          handleGet(request),\n      },\n    },\n  });\n`;

write(routePath, route);
write(apiPath, api);
write(storagePath, storage);
write(readPath, customersRead);
write(configPath, clientConfigServer);
write(contextApiPath, contextApi);

console.log('✓ Paso 3 carga clientes existentes por clientId');
console.log('✓ Encabezado usa la empresa del clientId actual');
console.log('✓ Guardado usa y valida el clientId de la URL');
console.log('✓ El cliente activo del .env queda como fallback');
console.log('✓ No se tocaron ventas, stock ni ERP');

try {
  execSync('git add src/routes/setup-clientes.tsx src/routes/api/setup-customers.ts src/routes/api/setup-client-context.ts src/lib/setup/customers-storage.server.ts src/lib/setup/customers-read.server.ts src/lib/setup/client-config.server.ts', { stdio: 'inherit' });
  execSync('git commit -m "Corrige contexto multiempresa del Paso 3"', { stdio: 'inherit' });
  execSync('git push origin respaldo-instalador-avanzado', { stdio: 'inherit' });
  console.log('✓ Corrección enviada a GitHub');
} catch (error) {
  console.log('El código quedó aplicado localmente. Revisa git status si el push no terminó.');
}
