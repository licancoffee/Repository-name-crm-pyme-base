const fs = require('fs');

const path = 'src/routes/historial.tsx';
let source = fs.readFileSync(path, 'utf8');

const helper = `\nfunction cleanSaleNote(note) {\n  const value = String(note || \"\").trim();\n\n  if (!value) {\n    return \"\";\n  }\n\n  return value.replace(\n    /^(Origen cotización\\s+(COT-[^·]+))\\s*·\\s*Cotización\\s+\\2$/i,\n    \"$1\",\n  );\n}\n`;

if (!source.includes('function cleanSaleNote(')) {
  const anchor = '\nfunction Historial() {';

  if (!source.includes(anchor)) {
    throw new Error('No se encontró el punto para agregar cleanSaleNote');
  }

  source = source.replace(anchor, `${helper}${anchor}`);
}

const oldBlock = `{sale.note && (\n                      <p className=\"mt-3 rounded-lg bg-muted p-2 text-sm italic\">\n                        {\n                          sale.note\n                        }\n                      </p>\n                    )}`;

const newBlock = `{sale.note && (\n                      <p className=\"mt-3 rounded-lg bg-muted p-2 text-sm italic\">\n                        {cleanSaleNote(sale.note)}\n                      </p>\n                    )}`;

if (!source.includes(oldBlock)) {
  if (!source.includes('{cleanSaleNote(sale.note)}')) {
    throw new Error('No se encontró el bloque visual de sale.note');
  }
} else {
  source = source.replace(oldBlock, newBlock);
}

fs.writeFileSync(path, source, 'utf8');
console.log('✓ Historial corregido visualmente');
console.log('✓ Los datos originales en Sheets no fueron modificados');
console.log('✓ Las notas duplicadas antiguas se mostrarán una sola vez');
