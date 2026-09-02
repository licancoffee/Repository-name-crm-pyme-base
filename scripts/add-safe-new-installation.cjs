const fs = require('fs');
const { execSync } = require('child_process');

const setupPath = 'src/routes/setup.tsx';
const hubPath = 'src/routes/instalador.tsx';

let setup = fs.readFileSync(setupPath, 'utf8');
let hub = fs.readFileSync(hubPath, 'utf8');

function fail(message) {
  throw new Error(message);
}

// 1) Importar configuración base genérica sin depender del formato del import.
if (!setup.includes('from "@/lib/config/client.defaults"') &&
    !setup.includes("from '@/lib/config/client.defaults'")) {
  const clientImportRegex = /import\s*\{[\s\S]*?\}\s*from\s*["']@\/lib\/config\/client["'];?/m;
  const match = setup.match(clientImportRegex);

  if (!match || !match[0].includes('clientConfig')) {
    fail('No se encontró el import real de clientConfig en setup.tsx');
  }

  setup = setup.replace(
    clientImportRegex,
    `${match[0]}\n\nimport {\n  defaultClientConfig,\n} from "@/lib/config/client.defaults";`,
  );
}

// 2) Helpers del modo nueva instalación.
if (!setup.includes('function isNewInstallationMode()')) {
  const cloneMarker = /function\s+cloneClientConfig\s*\(\s*\)\s*:\s*\n?\s*SetupForm\s*\{/m;
  const match = setup.match(cloneMarker);

  if (!match) {
    fail('No se encontró cloneClientConfig en setup.tsx');
  }

  const helpers = `function isNewInstallationMode() {\n  if (typeof window === "undefined") {\n    return false;\n  }\n\n  return new URLSearchParams(\n    window.location.search,\n  ).get("mode") === "new";\n}\n\nfunction normalizeRut(value: string) {\n  return value\n    .toUpperCase()\n    .replace(/[^0-9K]/g, "");\n}\n\nfunction clientIdFromRut(value: string) {\n  const normalized = normalizeRut(value);\n  return normalized\n    ? \`CL-\${normalized}\`\n    : "";\n}\n\n`;

  setup = setup.replace(cloneMarker, helpers + match[0]);
}

// 3) Hacer que ?mode=new parta desde la base genérica, nunca desde el cliente activo.
if (!setup.includes('const sourceConfig =')) {
  const startRegex = /function\s+cloneClientConfig\s*\(\s*\)\s*:\s*\n?\s*SetupForm\s*\{/m;
  const startMatch = startRegex.exec(setup);

  if (!startMatch) {
    fail('No se encontró el inicio de cloneClientConfig');
  }

  const cloneStart = startMatch.index;
  const setupPageMatch = /\n\s*function\s+SetupPage\s*\(/m.exec(setup.slice(cloneStart));

  if (!setupPageMatch) {
    fail('No se encontró el final de cloneClientConfig');
  }

  const cloneEnd = cloneStart + setupPageMatch.index;
  let cloneBlock = setup.slice(cloneStart, cloneEnd);

  // Primero cambia las referencias existentes. Después inserta la declaración,
  // para no convertir accidentalmente el fallback clientConfig en sourceConfig.
  cloneBlock = cloneBlock.replace(/\bclientConfig\b/g, 'sourceConfig');

  const openBraceRegex = /(function\s+cloneClientConfig\s*\(\s*\)\s*:\s*\n?\s*SetupForm\s*\{)/m;
  cloneBlock = cloneBlock.replace(
    openBraceRegex,
    `$1\n  const sourceConfig =\n    isNewInstallationMode()\n      ? defaultClientConfig\n      : clientConfig;`,
  );

  setup = setup.slice(0, cloneStart) + cloneBlock + setup.slice(cloneEnd);
}

// 4) Bloquear reutilización del RUT del cliente activo en modo nuevo.
if (!setup.includes('Este RUT pertenece al cliente activo')) {
  const savingRegex = /\n\s*setSaveState\s*\(\s*\{\s*\n?\s*status:\s*["']saving["']/m;
  const match = savingRegex.exec(setup);

  if (!match) {
    fail('No se encontró el punto previo al guardado en saveConfiguration');
  }

  const guard = `\n    if (\n      isNewInstallationMode() &&\n      normalizeRut(form.company.rut) ===\n        normalizeRut(clientConfig.company.rut)\n    ) {\n      setSaveState({\n        status: "error",\n        message:\n          "Este RUT pertenece al cliente activo. Para una nueva instalación debes usar un RUT diferente.",\n      });\n      return;\n    }\n`;

  setup = setup.slice(0, match.index) + guard + setup.slice(match.index);
}

// 5) Aviso visible de aislamiento y CLIENT_ID esperado.
if (!setup.includes('Modo nueva instalación')) {
  const containerRegex = /<div\s+className=["']space-y-6["']>/m;
  const match = containerRegex.exec(setup);

  if (!match) {
    fail('No se encontró el contenedor principal del formulario');
  }

  const insertAt = match.index + match[0].length;
  const notice = `\n          {isNewInstallationMode() && (\n            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">\n              <p className="font-semibold">Modo nueva instalación</p>\n              <p className="mt-1 text-sm text-muted-foreground">\n                Esta configuración parte desde la base genérica y no modifica al cliente activo mientras uses un RUT distinto.\n              </p>\n              {form.company.rut.trim() && (\n                <p className="mt-2 text-xs font-medium text-muted-foreground">\n                  CLIENT_ID esperado: {clientIdFromRut(form.company.rut)}\n                </p>\n              )}\n            </div>\n          )}`;

  setup = setup.slice(0, insertAt) + notice + setup.slice(insertAt);
}

// 6) Botón Nueva instalación en el Centro.
if (!hub.includes('Crear otra empresa sin reutilizar los datos')) {
  const mainRegex = /<main\s+className=["']mx-auto w-full max-w-5xl space-y-6 px-4 py-6["']>/m;
  const match = mainRegex.exec(hub);

  if (!match) {
    fail('No se encontró el main del Centro de instalación');
  }

  const insertAt = match.index + match[0].length;
  const block = `\n        <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">\n          <div>\n            <h2 className="font-semibold">Nueva instalación</h2>\n            <p className="mt-1 text-sm text-muted-foreground">\n              Crear otra empresa sin reutilizar los datos de {companyName}.\n            </p>\n          </div>\n\n          <a\n            href="/setup?mode=new"\n            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"\n          >\n            Nueva instalación\n            <ArrowRight className="h-4 w-4" />\n          </a>\n        </section>`;

  hub = hub.slice(0, insertAt) + block + hub.slice(insertAt);
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
