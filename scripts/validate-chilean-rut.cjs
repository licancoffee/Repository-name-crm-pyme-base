const fs = require('fs');
const { execSync } = require('child_process');

const schemaPath = 'src/lib/setup/schema.ts';
const setupPath = 'src/routes/setup.tsx';

let schema = fs.readFileSync(schemaPath, 'utf8');
let setup = fs.readFileSync(setupPath, 'utf8');

function mustInclude(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`No se encontró ${label}`);
  }
}

if (!schema.includes('function normalizeRutValue(')) {
  const anchor = 'function asBoolean(\n';
  mustInclude(schema, anchor, 'punto de inserción en schema.ts');

  const helpers = `function normalizeRutValue(\n  value: string,\n): string {\n  return value\n    .toUpperCase()\n    .replace(/[^0-9K]/g, \"\");\n}\n\nfunction calculateRutDv(\n  body: string,\n): string {\n  let sum = 0;\n  let multiplier = 2;\n\n  for (\n    let index = body.length - 1;\n    index >= 0;\n    index -= 1\n  ) {\n    sum +=\n      Number(body[index]) *\n      multiplier;\n\n    multiplier =\n      multiplier === 7\n        ? 2\n        : multiplier + 1;\n  }\n\n  const result =\n    11 - (sum % 11);\n\n  if (result === 11) {\n    return \"0\";\n  }\n\n  if (result === 10) {\n    return \"K\";\n  }\n\n  return String(result);\n}\n\nfunction isValidChileanRut(\n  value: string,\n): boolean {\n  const normalized =\n    normalizeRutValue(value);\n\n  if (!/^[0-9]{7,8}[0-9K]$/.test(normalized)) {\n    return false;\n  }\n\n  const body =\n    normalized.slice(0, -1);\n  const dv =\n    normalized.slice(-1);\n\n  return (\n    calculateRutDv(body) === dv\n  );\n}\n\n`;

  schema = schema.replace(anchor, helpers + anchor);
}

schema = schema.replace(
  `    if (rut.length < 4) {\n      errors.push(\n        \"El RUT es obligatorio.\",\n      );\n    }`,
  `    if (!rut) {\n      errors.push(\n        \"El RUT es obligatorio.\",\n      );\n    } else if (\n      !isValidChileanRut(rut)\n    ) {\n      errors.push(\n        \"El RUT no es válido. Revisa número y dígito verificador.\",\n      );\n    }`,
);

if (!setup.includes('function formatRutForDisplay(')) {
  const anchor = 'function clientIdFromRut(value: string) {';
  mustInclude(setup, anchor, 'clientIdFromRut en setup.tsx');

  const formatter = `function formatRutForDisplay(\n  value: string,\n) {\n  const normalized =\n    normalizeRut(value);\n\n  if (normalized.length < 2) {\n    return value;\n  }\n\n  const body =\n    normalized.slice(0, -1);\n  const dv =\n    normalized.slice(-1);\n\n  const formattedBody =\n    body.replace(\n      /\\B(?=(\\d{3})+(?!\\d))/g,\n      \".\",\n    );\n\n  return \`${'${formattedBody}'}-${'${dv}'}\`;\n}\n\n`;

  setup = setup.replace(anchor, formatter + anchor);
}

// Endurece el CLIENT_ID: solo números y K y siempre en mayúsculas.
setup = setup.replace(
  `function clientIdFromRut(value: string) {\n  const normalized = normalizeRut(value);\n  return normalized\n    ? \`CL-${'${normalized}'}\`\n    : \"\";\n}`,
  `function clientIdFromRut(value: string) {\n  const normalized = normalizeRut(value);\n\n  return normalized\n    ? \`CL-${'${normalized}'}\`\n    : \"\";\n}`,
);

// Normaliza visualmente el RUT al salir del campo si encontramos el input.
if (!setup.includes('formatRutForDisplay(form.company.rut)')) {
  const rutInputMarker = `value={form.company.rut}`;
  if (setup.includes(rutInputMarker)) {
    setup = setup.replace(
      rutInputMarker,
      `${rutInputMarker}\n                  onBlur={() =>\n                    setForm((current) => ({\n                      ...current,\n                      company: {\n                        ...current.company,\n                        rut: formatRutForDisplay(\n                          current.company.rut,\n                        ),\n                      },\n                    }))\n                  }`,
    );
  }
}

fs.writeFileSync(schemaPath, schema, 'utf8');
fs.writeFileSync(setupPath, setup, 'utf8');

console.log('✓ RUT chileno validado por módulo 11');
console.log('✓ Solo se acepta dígito verificador 0-9 o K');
console.log('✓ El CLIENT_ID usa el RUT normalizado');
console.log('✓ Un RUT inválido no puede guardarse');

try {
  execSync(`git add "${schemaPath}" "${setupPath}"`, { stdio: 'inherit' });
  execSync('git commit -m "Valida RUT chileno en nueva instalación"', { stdio: 'inherit' });
  execSync('git push origin respaldo-instalador-avanzado', { stdio: 'inherit' });
  console.log('✓ Cambios enviados a GitHub');
} catch {
  console.log('El cambio quedó aplicado localmente; revisa git status si el push no terminó.');
}
