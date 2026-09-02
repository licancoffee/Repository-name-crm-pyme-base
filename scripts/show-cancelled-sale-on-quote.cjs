const fs = require('fs');

const path = 'src/routes/historial-cotizaciones.tsx';
let source = fs.readFileSync(path, 'utf8');

if (!source.includes('visibleSales')) {
  source = source.replace(
    'import { useDB } from "@/lib/crm/store";',
    'import { useDB, visibleSales } from "@/lib/crm/store";',
  );
}

if (!source.includes('const sales = visibleSales(db);')) {
  source = source.replace(
    '  const navigate = useNavigate();',
    '  const navigate = useNavigate();\n  const sales = visibleSales(db);',
  );
}

if (!source.includes('function saleStatusForQuote(')) {
  const anchor = '\n\n  function findCustomer(';
  const helper = `\n\n  function saleStatusForQuote(cot) {\n    if (!cot?.ventaId) {\n      return \"\";\n    }\n\n    const sale = sales.find((item) => item.id === cot.ventaId);\n    return String(sale?.status || \"\").toUpperCase();\n  }`;

  if (!source.includes(anchor)) {
    throw new Error('No se encontró el punto para agregar saleStatusForQuote');
  }

  source = source.replace(anchor, helper + anchor);
}

const oldBlock = `{cot.ventaId && (\n                      <p className=\"text-xs text-muted-foreground\">\n                        Venta:{\" \"}\n                        {cot.ventaId}\n                      </p>\n                    )}`;

const newBlock = `{cot.ventaId && (\n                      <p className=\"text-xs text-muted-foreground\">\n                        Venta asociada:{\" \"}\n                        {cot.ventaId}\n                        {saleStatusForQuote(cot) === \"ANULADA\" ? \" · ANULADA\" : \"\"}\n                      </p>\n                    )}`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
} else if (!source.includes('Venta asociada:')) {
  const generic = /\{cot\.ventaId\s*&&\s*\(\s*<p className="text-xs text-muted-foreground">[\s\S]*?\{cot\.ventaId\}[\s\S]*?<\/p>\s*\)\}/m;

  if (!generic.test(source)) {
    throw new Error('No se encontró el bloque de venta asociada');
  }

  source = source.replace(generic, newBlock);
}

fs.writeFileSync(path, source, 'utf8');
console.log('✓ Historial de cotizaciones actualizado');
console.log('✓ Cotizaciones convertidas conservan su estado');
console.log('✓ Si la venta asociada está anulada, ahora se mostrará ANULADA');
