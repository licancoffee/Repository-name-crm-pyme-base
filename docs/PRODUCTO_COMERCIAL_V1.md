# CRM Comercial PyME Base — V1

## Identidad del proyecto

CRM Comercial PyME Base es un producto independiente de Lican Coffee SpA, diseñado para instalarse y comercializarse a múltiples PyMEs.

No comparte base de datos, configuración, CLIENT_ID, credenciales, branding ni lógica específica de Lican Coffee.

## Principios de arquitectura

- Cada empresa instalada tiene su propio `CLIENT_ID`.
- Cada empresa tiene su propio backend operativo Apps Script y su propia hoja operativa.
- El instalador central solo administra configuración e instalación.
- El backend operativo V3 valida que el `CLIENT_ID` recibido coincida exactamente con el configurado en la empresa.
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

## Alcance V1 comercial

La V1 se considera lista para comercializar cuando estén certificados:

1. Instalador de 4 pasos.
2. Configuración de empresa.
3. Productos y clientes.
4. Conexión operativa por `CLIENT_ID`.
5. Venta y descuento de stock.
6. Anulación y devolución de stock.
7. Cotización sin descuento de stock.
8. PDF de cotización.
9. Envío de cotización por correo.
10. Envío/compartición por WhatsApp.
11. Conversión de cotización a venta.
12. Aislamiento multiempresa.
13. Sincronización PC/celular.
14. Idempotencia en operaciones críticas.
15. Typecheck, build y despliegue final verdes.

## Regla de cierre

Hasta cerrar la V1 no se agregan módulos nuevos. El trabajo se concentra en estabilidad, trazabilidad, seguridad de aislamiento y certificación del flujo comercial completo.
