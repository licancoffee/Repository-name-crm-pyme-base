const fs = require('fs');
const { execSync } = require('child_process');

const setupPath = 'src/routes/setup.tsx';
const hubPath = 'src/routes/instalador.tsx';

let setup = fs.readFileSync(setupPath, 'utf8');
let hub = fs.readFileSync(hubPath, 'utf8');

function fail(message) {
  throw new Error(message);
}

// 1) Setup: importar configuración base genérica.
if (!setup.includes('defaultClientConfig')) {
  const marker = 'import {\n  clientConfig,\n  type ClientConfig,\n} from "@/lib/config/client";';
  if (!setup.includes(marker)) fail('No se encontró import de clientConfig en setup.tsx');
  setup = setup.replace(
    marker,
    `${marker}\n\nimport {\n  defaultClientConfig,\n} from "@/lib/config/client.defaults";`,
  );
}

// 2) Setup: helpers para modo nueva instalación y CLIENT_ID por RUT.
if (!setup.includes('function isNewInstallationMode()')) {
  const marker = 'function cloneClientConfig():\nSetupForm {';
  if (!setup.includes(marker)) fail('No se encontró cloneClientConfig en setup.tsx');

  const helpers = `function isNewInstallationMode() {\n  if (typeof window === "undefined") {\n    return false;\n  }\n\n  return new URLSearchParams(\n    window.location.search,\n  ).get("mode") === "new";\n}\n\nfunction normalizeRut(value: string) {\n  return value\n    .toUpperCase()\n    .replace(/[^0-9K]/g, "");\n}\n\nfunction clientIdFromRut(value: string) {\n  const normalized = normalizeRut(value);\n  return normalized\n    ? \`CL-\${normalized}\`\n    : "";\n}\n\n`;

  setup = setup.replace(marker, helpers + marker);
}

// 3) Setup: clonar desde base genérica cuando ?mode=new.
const cloneStart = setup.indexOf('function cloneClientConfig():\nSetupForm {');
const cloneEnd = setup.indexOf('\n\nfunction SetupPage()', cloneStart);
if (cloneStart < 0 || cloneEnd < 0) fail('No se pudo localizar cloneClientConfig completo');

let cloneBlock = setup.slice(cloneStart, cloneEnd);
if (!cloneBlock.includes('const sourceConfig =')) {
  cloneBlock = cloneBlock.replace(
    'function cloneClientConfig():\nSetupForm {\n  return {',
    'function cloneClientConfig():\nSetupForm {\n  const sourceConfig =\n    isNewInstallationMode()\n      ? defaultClientConfig\n      : clientConfig;\n\n  return {',
  );
  cloneBlock = cloneBlock.replace(/clientConfig/g, 'sourceConfig');
  setup = setup.slice(0, cloneStart) + cloneBlock + setup.slice(cloneEnd);
}

// 4) Setup: impedir que "Nueva instalación" use el mismo RUT del cliente activo.
if (!setup.includes('Este RUT pertenece al cliente activo')) {
  const marker = '    setSaveState({\n      status: "saving",';
  if (!setup.includes(marker)) fail('No se encontró punto de validación en saveConfiguration');

  const guard = `    if (\n      isNewInstallationMode() &&\n      normalizeRut(form.company.rut) ===\n        normalizeRut(clientConfig.company.rut)\n    ) {\n      setSaveState({\n        status: "error",\n        message:\n          "Este RUT pertenece al cliente activo. Para una nueva instalación debes usar un RUT diferente.",\n      });\n      return;\n    }\n\n`;

  setup = setup.replace(marker, guard + marker);
}

// 5) Setup: mostrar aviso de aislamiento + CLIENT_ID esperado.
if (!setup.includes('Modo nueva instalación')) {
  const marker = '        <div className="space-y-6">';
  if (!setup.includes(marker)) fail('No se encontró contenedor principal del setup');

  const notice = `        <div className="space-y-6">\n          {isNewInstallationMode() && (\n            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">\n              <p className="font-semibold">Modo nueva instalación</p>\n              <p className="mt-1 text-sm text-muted-foreground">\n                Esta configuración parte desde la base genérica y no modifica al cliente activo mientras uses un RUT distinto.\n              </p>\n              {form.company.rut.trim() && (\n                <p className="mt-2 text-xs font-medium text-muted-foreground">\n                  CLIENT_ID esperado: {clientIdFromRut(form.company.rut)}\n                </p>\n              )}\n            </div>\n          )}`;

  setup = setup.replace(marker, notice);
}

// 6) Hub: agregar tarjeta/acción visible "Nueva instalación".
if (!hub.includes('Crear otra empresa sin reutilizar los datos')) {
  const marker = '      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">';
  if (!hub.includes(marker)) fail('No se encontró main del instalador');

  const block = `${marker}\n        <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">\n          <div>\n            <h2 className="font-semibold">Nueva instalación</h2>\n            <p className="mt-1 text-sm text-muted-foreground">\n              Crear otra empresa sin reutilizar los datos de {companyName}.\n            </p>\n          </div>\n\n          <a\n            href="/setup?mode=new"\n            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"\n          >\n            Nueva instalación\n            <ArrowRight className="h-4 w-4" />\n          </a>\n        </section>`;

  hub = hub.replace(marker, block);
}

fs.writeFileSync(setupPath, setup, 'utf8');
fs.writeFileSync(hubPath, hub, 'utf8');

console.log('✓ Botón Nueva instalación agregado');
console.log('✓ El modo nuevo parte desde Empresa Demo/base genérica');
console.log('✓ Se bloquea reutilizar el RUT del cliente activo');
console.log('✓ Se muestra el CLIENT_ID esperado a partir del RUT');
console.log('✓ DULCEVILLARRICA no se modifica con este cambio');

try {
  execSync(`git add "${setupPath}" "${hubPath}"`, { stdio: 'inherit' });
  execSync('git commit -m "Agrega modo seguro de nueva instalación"', { stdio: 'inherit' });
  execSync('git push origin respaldo-instalador-avanzado', { stdio: 'inherit' });
  console.log('✓ Cambio enviado a GitHub');
} catch (error) {
  console.log('El cambio quedó aplicado localmente. Si el push no terminó, revisa git status.');
}
