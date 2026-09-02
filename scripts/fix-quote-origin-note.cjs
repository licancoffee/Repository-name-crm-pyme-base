const fs = require('fs');

const targets = [
  {
    path: 'src/routes/nueva-cotizacion.tsx',
    from: `      note: [\n        createdQuote.numero\n          ? \`Cotización \${createdQuote.numero}\`\n          : "Cotización",\n        note.trim(),\n      ]\n        .filter(Boolean)\n        .join(" · "),`,
    to: `      note: note.trim(),`,
  },
  {
    path: 'src/routes/historial-cotizaciones.tsx',
    from: `        note:\n          [\n            \`Cotización \${cot.numero}\`,\n            cot.observaciones,\n          ]\n            .filter(Boolean)\n            .join(" · "),`,
    to: `        note:\n          String(\n            cot.observaciones || "",\n          ).trim(),`,
  },
];

for (const target of targets) {
  let source = fs.readFileSync(target.path, 'utf8');

  if (!source.includes(target.from)) {
    throw new Error(`No se encontró el bloque esperado en ${target.path}`);
  }

  source = source.replace(target.from, target.to);
  fs.writeFileSync(target.path, source, 'utf8');
  console.log(`✓ Corregido ${target.path}`);
}

console.log('✓ Las próximas ventas desde cotización mostrarán una sola referencia de origen.');
