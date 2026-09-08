# CRM Comercial PyME Base — V1

## Identidad del proyecto

CRM Comercial PyME Base es un producto independiente de Lican Coffee SpA, diseñado para instalarse y comercializarse a múltiples PyMEs.

No comparte base de datos, configuración, CLIENT_ID, credenciales, branding ni lógica específica de Lican Coffee.

## Principios de arquitectura

- Cada empresa instalada tiene su propio `CLIENT_ID`.
- Cada empresa tiene su propio backend operativo Apps Script y su propia hoja operativa.
- El instalador central solo administra configuración e instalación.
- El backend operativo V4 valida que el `CLIENT_ID` recibido coincida exactamente con el configurado en la empresa.
- Nuevas instalaciones no requieren `CRM_API_TOKEN` operativo por empresa.
- `SETUP_STORAGE_TOKEN` pertenece únicamente al instalador central y no debe mezclarse con la operación de clientes.

## Reutilización permitida desde Lican Coffee

Se reutilizan patrones ya probados, nunca datos ni configuración específica:

- UX de ventas y cotizaciones.
- Generación de comprobantes y mensajes WhatsApp.
- Validación de stock.
- Idempotencia de ventas y anulaciones.
- Manejo de errores y estados de sincronización.
- Estructura visual y componentes genéricos cuando sean parametrizables.

## No se debe copiar desde Lican Coffee

- Nombre, logo, teléfono, dominio o textos de Lican Coffee.
- IDs de planillas o Apps Script de Lican Coffee.
- Catálogo, precios, clientes, ventas, compras o inventario de Lican Coffee.
- Reglas comerciales específicas de Lican Coffee salvo que estén parametrizadas por empresa.
- `CRM_API_TOKEN` del CRM Lican Coffee.

## Alcance V1 comercial — certificado

1. Instalador de 4 pasos. ✅
2. Configuración de empresa. ✅
3. Productos y clientes. ✅
4. Conexión operativa por `CLIENT_ID`. ✅
5. Venta y descuento de stock. ✅
6. Anulación y devolución de stock. ✅
7. Cotización sin descuento de stock. ✅
8. PDF de cotización. ✅
9. Envío de cotización por correo. ✅
10. Envío/compartición por WhatsApp. ✅
11. Conversión de cotización a venta. ✅
12. Aislamiento multiempresa y rechazo de `CLIENT_ID` incorrecto. ✅
13. Navegación e identidad persistente en PC y móvil. ✅
14. Idempotencia de anulación sin doble reposición de stock. ✅
15. Typecheck, build y despliegue final verdes. ✅

## Backend operativo V4 — 1.4.0

Archivo de reemplazo completo:

`docs/apps-script/CRMBaseOperativoV4.gs`

Características certificadas:

- Ventas y detalle de items.
- Anulación con reposición de stock.
- Inventario y movimientos.
- Cotizaciones y items.
- Validación estricta por `CLIENT_ID`.
- PDF de cotización.
- Envío por correo con PDF adjunto.
- Estado `ENVIADA` solo tras envío exitoso.
- Conservación de cotización y PDF como `GENERADA_SIN_ENVIO` cuando falla correo.
- Acción `reenviarCotizacion` sin duplicar cotización.
- Conversión de cotización a venta.

## Certificación PC / móvil

La V1 fue validada automáticamente con dos perfiles de navegador:

- PC: 1440 × 900.
- Móvil: 390 × 844.

La prueba recorrió Inicio, Venta, Cotizaciones, Clientes, Stock e Historial, comprobando:

- identidad de la empresa correcta;
- ausencia de `EMPRESA DEMO`;
- conservación del `CLIENT_ID`;
- persistencia de identidad al navegar a rutas sin query explícita.

Resultado final:

- `PC_OK`
- `MOVIL_OK`
- `PC_MOVIL_NAVEGACION_IDENTIDAD_OK`

## Despliegue seguro del backend V4

Para una empresa ya instalada:

1. Abrir el Apps Script vinculado a la hoja operativa de esa empresa.
2. Reemplazar completamente el contenido de `Código.gs` por `CRMBaseOperativoV4.gs`.
3. No crear un segundo archivo `.gs` de respaldo dentro del mismo proyecto.
4. Guardar.
5. Administrar implementaciones → editar la implementación existente → Nueva versión.
6. Mantener la misma URL `/exec`.
7. Verificar `ping` y confirmar versión `1.4.0`.
8. Generar una cotización de prueba y verificar correo, PDF, estado e inventario.

## Estado comercial

**CRM Comercial PyME Base V1 queda certificado para inicio de comercialización controlada.**

Durante esta etapa no se agregan módulos nuevos. Solo se aceptan:

- correcciones de bugs reales;
- mejoras de estabilidad;
- seguridad y aislamiento;
- ajustes de onboarding;
- documentación y soporte.

Las nuevas funciones se planifican para versiones posteriores.
