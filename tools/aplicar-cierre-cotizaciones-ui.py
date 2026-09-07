from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: se esperaba 1 coincidencia y se encontraron {count}")
    return text.replace(old, new, 1)


# Nueva cotización
path = Path("src/routes/nueva-cotizacion.tsx")
text = path.read_text(encoding="utf-8")

text = replace_once(
    text,
    '  FileText,\n  Minus,',
    '  FileText,\n  MessageCircle,\n  Minus,',
    "import MessageCircle nueva-cotizacion",
)

text = replace_once(
    text,
    'import {\n  crearCotizacion,\n} from "@/lib/crm/cotizaciones/cotizaciones.functions";\n',
    'import {\n  crearCotizacion,\n} from "@/lib/crm/cotizaciones/cotizaciones.functions";\n\nimport {\n  openQuoteWhatsapp,\n} from "@/lib/crm/cotizaciones/whatsapp";\n',
    "import whatsapp nueva-cotizacion",
)

marker = '''  function convertToSale() {\n'''
whatsapp_fn = '''  function shareQuoteWhatsapp() {\n    if (!createdQuote?.numero) {\n      toast.error(\n        "Primero debes generar la cotización.",\n      );\n      return;\n    }\n\n    openQuoteWhatsapp({\n      numero: createdQuote.numero,\n      cliente: customerName.trim(),\n      telefono: customerPhone.trim(),\n      total: totals.total,\n      pdfUrl: createdQuote.pdfUrl,\n      formaPago: paymentLabels[payment] ?? payment,\n      observaciones: note.trim() || undefined,\n      items: lines.map((line) => ({\n        producto: line.name,\n        formato: line.format,\n        cantidad: line.qty,\n        precioUnitario: line.price,\n      })),\n    });\n  }\n\n'''
text = replace_once(text, marker, whatsapp_fn + marker, "función WhatsApp nueva-cotizacion")

old_block = '''            <Button\n              className="mt-3 h-12 w-full"\n              onClick={convertToSale}\n            >\n              <ShoppingCart className="mr-2 h-5 w-5" />\n              Convertir en venta\n            </Button>\n'''
new_block = '''            <div className="mt-3 grid gap-2 sm:grid-cols-2">\n              <Button\n                variant="outline"\n                className="h-12 w-full"\n                onClick={shareQuoteWhatsapp}\n              >\n                <MessageCircle className="mr-2 h-5 w-5" />\n                Enviar por WhatsApp\n              </Button>\n\n              <Button\n                className="h-12 w-full"\n                onClick={convertToSale}\n              >\n                <ShoppingCart className="mr-2 h-5 w-5" />\n                Convertir en venta\n              </Button>\n            </div>\n'''
text = replace_once(text, old_block, new_block, "botón WhatsApp nueva-cotizacion")
path.write_text(text, encoding="utf-8")


# Historial de cotizaciones
path = Path("src/routes/historial-cotizaciones.tsx")
text = path.read_text(encoding="utf-8")

text = replace_once(
    text,
    '  FileText,\n  RefreshCw,',
    '  FileText,\n  Mail,\n  MessageCircle,\n  RefreshCw,',
    "imports iconos historial",
)

text = replace_once(
    text,
    'import {\n  listarCotizaciones,\n} from "@/lib/crm/cotizaciones/cotizaciones.functions";\n',
    'import {\n  listarCotizaciones,\n  reenviarCotizacion,\n} from "@/lib/crm/cotizaciones/cotizaciones.functions";\n\nimport {\n  openQuoteWhatsapp,\n} from "@/lib/crm/cotizaciones/whatsapp";\n',
    "imports reenvío y whatsapp historial",
)

text = replace_once(
    text,
    '  const [converting, setConverting] =\n    useState(false);\n',
    '  const [converting, setConverting] =\n    useState(false);\n\n  const [resendingQuote, setResendingQuote] =\n    useState<string | null>(null);\n',
    "estado reenvío historial",
)

marker = '''  function openUrl(\n'''
helpers = '''  function shareQuoteWhatsapp(\n    cot: CotizacionHistorial,\n  ) {\n    const items = Array.isArray(cot.items) ? cot.items : [];\n\n    openQuoteWhatsapp({\n      numero: cot.numero,\n      cliente: cot.cliente || "Cliente",\n      telefono: cot.telefono || "",\n      total: Number(cot.total || 0),\n      pdfUrl: cot.pdfUrl,\n      formaPago: cot.formaPago,\n      observaciones: cot.observaciones,\n      items: items.map((item) => ({\n        producto: item.producto,\n        formato: item.formato,\n        cantidad: Number(item.cantidad || 0),\n        precioUnitario: Number(item.precioUnitario || 0),\n      })),\n    });\n  }\n\n  async function resendQuoteEmail(\n    cot: CotizacionHistorial,\n  ) {\n    if (resendingQuote) return;\n\n    if (!cot.email?.trim()) {\n      toast.error("La cotización no tiene correo de destinatario.");\n      return;\n    }\n\n    setResendingQuote(cot.numero);\n\n    try {\n      const result = await reenviarCotizacion({\n        data: {\n          numero: cot.numero,\n          email: cot.email.trim(),\n        },\n      });\n\n      if (!result.ok) {\n        throw new Error(\n          result.mensaje || result.error || "No fue posible reenviar la cotización.",\n        );\n      }\n\n      toast.success(\n        `Cotización ${cot.numero} enviada nuevamente por correo.`,\n      );\n      await loadQuotes();\n    } catch (error) {\n      toast.error(\n        error instanceof Error\n          ? error.message\n          : "No fue posible reenviar la cotización.",\n      );\n    } finally {\n      setResendingQuote(null);\n    }\n  }\n\n'''
text = replace_once(text, marker, helpers + marker, "helpers historial")

old_buttons = '''                  <Button\n                    className="col-span-2 h-11 sm:col-auto"\n                    disabled={\n                      !canConvert(\n                        cot,\n                      ) ||\n                      converting\n                    }\n                    onClick={() =>\n                      convertToSale(\n                        cot,\n                      )\n                    }\n                  >\n                    <ShoppingCart className="mr-2 h-4 w-4" />\n                    {normalizeText(\n                      cot.estado,\n                    ) ===\n                    "convertida"\n                      ? "Ya convertida"\n                      : "Convertir en venta"}\n                  </Button>\n'''
new_buttons = '''                  <Button\n                    variant="outline"\n                    className="h-11"\n                    disabled={!cot.telefono}\n                    onClick={() =>\n                      shareQuoteWhatsapp(cot)\n                    }\n                  >\n                    <MessageCircle className="mr-2 h-4 w-4" />\n                    WhatsApp\n                  </Button>\n\n                  {normalizeText(cot.estado) === "generada_sin_envio" && (\n                    <Button\n                      variant="outline"\n                      className="h-11"\n                      disabled={resendingQuote === cot.numero || !cot.email}\n                      onClick={() => void resendQuoteEmail(cot)}\n                    >\n                      <Mail className="mr-2 h-4 w-4" />\n                      {resendingQuote === cot.numero ? "Reenviando..." : "Reenviar correo"}\n                    </Button>\n                  )}\n\n                  <Button\n                    className="col-span-2 h-11 sm:col-auto"\n                    disabled={\n                      !canConvert(\n                        cot,\n                      ) ||\n                      converting\n                    }\n                    onClick={() =>\n                      convertToSale(\n                        cot,\n                      )\n                    }\n                  >\n                    <ShoppingCart className="mr-2 h-4 w-4" />\n                    {normalizeText(\n                      cot.estado,\n                    ) ===\n                    "convertida"\n                      ? "Ya convertida"\n                      : "Convertir en venta"}\n                  </Button>\n'''
text = replace_once(text, old_buttons, new_buttons, "botones tarjeta historial")

old_footer = '''                <Button\n                  disabled={\n                    !canConvert(\n                      selected,\n                    ) ||\n                    converting\n                  }\n                  onClick={() =>\n                    convertToSale(\n                      selected,\n                    )\n                  }\n                >\n                  <ShoppingCart className="mr-2 h-4 w-4" />\n\n                  {normalizeText(\n                    selected.estado,\n                  ) ===\n                  "convertida"\n                    ? "Ya convertida"\n                    : "Convertir en venta"}\n                </Button>\n'''
new_footer = '''                <div className="flex flex-wrap gap-2">\n                  <Button\n                    variant="outline"\n                    disabled={!selected.telefono}\n                    onClick={() => shareQuoteWhatsapp(selected)}\n                  >\n                    <MessageCircle className="mr-2 h-4 w-4" />\n                    WhatsApp\n                  </Button>\n\n                  {normalizeText(selected.estado) === "generada_sin_envio" && (\n                    <Button\n                      variant="outline"\n                      disabled={resendingQuote === selected.numero || !selected.email}\n                      onClick={() => void resendQuoteEmail(selected)}\n                    >\n                      <Mail className="mr-2 h-4 w-4" />\n                      {resendingQuote === selected.numero ? "Reenviando..." : "Reenviar correo"}\n                    </Button>\n                  )}\n\n                  <Button\n                    disabled={\n                      !canConvert(\n                        selected,\n                      ) ||\n                      converting\n                    }\n                    onClick={() =>\n                      convertToSale(\n                        selected,\n                      )\n                    }\n                  >\n                    <ShoppingCart className="mr-2 h-4 w-4" />\n\n                    {normalizeText(\n                      selected.estado,\n                    ) ===\n                    "convertida"\n                      ? "Ya convertida"\n                      : "Convertir en venta"}\n                  </Button>\n                </div>\n'''
text = replace_once(text, old_footer, new_footer, "footer historial")
path.write_text(text, encoding="utf-8")

print("Ajustes UI de cotizaciones aplicados correctamente.")
