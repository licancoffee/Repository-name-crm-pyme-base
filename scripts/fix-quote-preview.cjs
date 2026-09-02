const fs = require('fs');
const { execSync } = require('child_process');

const path = 'src/routes/nueva-cotizacion.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(label, pattern, replacement) {
  const matches = source.match(pattern);
  if (!matches) {
    throw new Error(`No se encontró el bloque: ${label}`);
  }
  source = source.replace(pattern, replacement);
}

replaceOnce(
  'tipo createdQuote',
  /useState<\{\s*numero\?: string;\s*estado\?: string;\s*\} \| null>\(null\);/m,
  `useState<{\n      numero?: string;\n      estado?: string;\n      pdfUrl?: string;\n      documentoUrl?: string;\n    } | null>(null);`,
);

replaceOnce(
  'guardar URLs de cotización',
  /setCreatedQuote\(\{\s*numero: result\.numero,\s*estado: result\.estado,\s*\}\);/m,
  `setCreatedQuote({\n        numero: result.numero,\n        estado: result.estado,\n        pdfUrl: result.pdfUrl,\n        documentoUrl: result.documentoUrl,\n      });`,
);

replaceOnce(
  'openPreview',
  /function openPreview\(\) \{\s*if \(!validate\(\)\) \{\s*return;\s*\}\s*setPreview\(true\);\s*\}/m,
  `function openPreview() {\n    if (createdQuote?.pdfUrl) {\n      window.open(\n        createdQuote.pdfUrl,\n        "_blank",\n        "noopener,noreferrer",\n      );\n      return;\n    }\n\n    if (!validate()) {\n      return;\n    }\n\n    setPreview(true);\n  }`,
);

replaceOnce(
  'texto botón principal',
  /\n\s*Vista previa de cotización\s*\n\s*<\/Button>/m,
  `\n          {createdQuote?.pdfUrl\n            ? "Ver cotización PDF"\n            : "Vista previa de cotización"}\n        </Button>`,
);

fs.writeFileSync(path, source, 'utf8');

console.log('✓ Vista previa corregida en nueva-cotizacion.tsx');
console.log('✓ Antes de enviar: abre preview local');
console.log('✓ Después de enviar: abre PDF existente sin reenviar');

try {
  execSync(`git add "${path}"`, { stdio: 'inherit' });
  execSync('git commit -m "Corrige vista previa para no reenviar cotizaciones"', { stdio: 'inherit' });
  execSync('git push origin respaldo-instalador-avanzado', { stdio: 'inherit' });
  console.log('✓ Cambio guardado y enviado a GitHub');
} catch (error) {
  console.log('El archivo quedó corregido localmente. Si no se pudo hacer push, ejecuta git status.');
}
