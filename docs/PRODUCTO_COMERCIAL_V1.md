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

## Alcance V1 comercial

La V1 se considera lista para comercializar cuando estén certificados:

1. Instalador de 4 pasos. ✅
2. Configuración de empresa. ✅
3. Productos y clientes. ✅
4. Conexión operativa por `CLIENT_ID`. ✅
5. Venta y descuento de stock. ✅
6. Anulación y devolución de stock. ✅
7. Cotización sin descuento de stock. ✅
8. PDF de cotización. ✅
9. Envío de cotización por correo. IMPLEMENTADO EN V4 — falta despliegue/prueba real.
10. Envío/compartición por WhatsApp. BASE IMPLEMENTADA — falta integrar botón visible y prueba real.
11. Conversión de cotización a venta. ✅
12. Aislamiento multiempresa. Backend estricto implementado — falta prueba negativa final.
13. Sincronización PC/celular. Pendiente de prueba final.
14. Idempotencia en operaciones críticas. Ventas/anulación implementadas; falta prueba de doble ejecución final.
15. Typecheck, build y despliegue final verdes. ✅ para frontend actual.

## Backend operativo V4 — 1.4.0

Archivo de reemplazo completo:

`docs/apps-script/CRMBaseOperativoV4.gs`

Cambios respecto de V3:

- Mantiene ventas, anulaciones, inventario, movimientos, cotizaciones y conversión.
- Mantiene validación estricta por `CLIENT_ID`.
- La cotización se guarda antes de intentar correo.
- Si el correo se envía correctamente, el estado pasa a `ENVIADA`.
- Si el correo falla, la cotización y su PDF se conservan en `GENERADA_SIN_ENVIO`.
- La respuesta informa el resultado de entrega mediante `envio`.
- Incorpora acción `reenviarCotizacion` para reintentar una cotización existente sin duplicarla.
- El reenvío exitoso actualiza el estado a `ENVIADA`.

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

## Regla de cierre

Hasta cerrar la V1 no se agregan módulos nuevos. El trabajo se concentra en estabilidad, trazabilidad, seguridad de aislamiento y certificación del flujo comercial completo.
