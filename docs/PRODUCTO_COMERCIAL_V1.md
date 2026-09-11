# Kaizu — Producto Comercial V1

## Identidad del producto

**Kaizu** es la marca comercial elegida para el CRM Comercial PyME Base desarrollado por Lican Coffee SpA, diseñado para instalarse y comercializarse a múltiples PyMEs.

Posicionamiento comercial recomendado:

**Kaizu — Sistema de ventas y gestión para pequeños negocios**

**Clientes · Ventas · Stock · Cotizaciones · WhatsApp**

Lema comercial:

**Ordena. Vende. Crece.**

Mensaje de apoyo:

> Un sistema simple para ordenar y controlar tus ventas, clientes, stock y cotizaciones desde el celular o computador.

No se debe vender como ERP contable ni como sistema de facturación electrónica SII en V1.

> Estado de marca: `kaizu.cl` fue encontrado disponible al momento de la revisión del 10-09-2026. La adopción comercial del nombre no equivale por sí sola a una autorización o registro marcario definitivo; antes de una inversión importante en marca se recomienda completar la revisión formal y presentación que corresponda ante INAPI.

## Arquitectura multiempresa

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
6. Comprobante de venta por WhatsApp. ✅
7. Anulación y devolución de stock. ✅
8. Cotización sin descuento de stock. ✅
9. PDF de cotización. ✅
10. Envío de cotización por correo. ✅
11. Envío/compartición por WhatsApp. ✅
12. Conversión de cotización a venta. ✅
13. Descuento de inventario al convertir cotización. ✅
14. Aislamiento multiempresa y rechazo de `CLIENT_ID` incorrecto. ✅
15. Navegación e identidad persistente en PC y móvil. ✅
16. Idempotencia de anulación sin doble reposición de stock. ✅
17. Piloto comercial de 7 días con planilla independiente. ✅
18. Generador administrativo de pilotos. ✅
19. Seguimiento comercial de prospectos y pilotos. ✅
20. Contador regresivo de días de piloto. ✅
21. CI posterior al ajuste de historial: verde. ✅

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

## Certificación comercial de piloto real

Piloto certificado:

`PILOTO-PILOTO-DEMO-01-B8C2`

Pruebas manuales completadas:

- venta con dos productos;
- descuento correcto de inventario;
- comprobante enviado por WhatsApp;
- anulación de venta;
- reposición correcta de inventario;
- cotización creada;
- PDF generado;
- correo recibido con PDF adjunto;
- cotización compartida por WhatsApp;
- cotización convertida a venta;
- registro de la venta resultante;
- descuento de inventario tras conversión.

Resultado: **flujo comercial operativo de punta a punta aprobado**.

## Ajustes de cierre comercial

- Las ventas anuladas ya no ofrecen la acción de reenviar comprobante en Historial.
- El piloto comercial activo usa contador regresivo en la planilla `Kaizu - Prospectos y Pilotos`.
- Para V1, la expiración se administra comercialmente: el piloto se marca como vencido y la suspensión técnica automática queda fuera del alcance hasta validar el proceso con clientes reales.

## Propuesta comercial inicial

Precio normal recomendado:

- **$24.990 + IVA / mes**
- **$59.990 + IVA** implementación inicial

Oferta fundadores — primeros 10 clientes:

- **$19.990 + IVA / mes**
- **$39.990 + IVA** implementación inicial

Proceso de adquisición:

**Prospecto → Demo de 10 minutos → Piloto individual 7 días → Cliente pagado**

El demo maestro no se entrega por 7 días; el piloto debe ser una instalación individual.

## Qué se vende

Beneficios a comunicar, en este orden:

1. Ordenar ventas y clientes.
2. Saber qué stock queda.
3. Crear cotizaciones profesionales.
4. Compartir comprobantes y cotizaciones por WhatsApp.
5. Tener historial y control básico del negocio desde celular o computador.

Evitar abrir la conversación con tecnicismos como `CRM`, `backend`, `CLIENT_ID`, Apps Script o arquitectura multiempresa.

## Guion breve de presentación

> Kaizu te ayuda a tener tus ventas, clientes, stock y cotizaciones en un solo lugar. Puedes usarlo desde el celular o computador y compartir comprobantes y cotizaciones directamente por WhatsApp. Te hacemos una demo de 10 minutos y, si te sirve, te dejamos un piloto de 7 días con tu negocio para que lo pruebes.

## Lanzamiento controlado

Objetivo inicial:

- captar los primeros 10 clientes fundadores;
- trabajar con comercios pequeños y negocios de servicios que hoy operan con cuadernos, Excel, WhatsApp o información dispersa;
- comenzar con captación directa y demostraciones, no con publicidad masiva pagada.

Canales recomendados:

- Marketplace y grupos de PyMEs;
- WhatsApp directo a contactos comerciales;
- Facebook e Instagram;
- red local de comerciantes de Villarrica, Lican Ray y comunas cercanas;
- referidos de clientes piloto.

## Estado comercial

**Kaizu V1 queda apto para inicio de comercialización controlada y pilotos reales.**

Durante esta etapa no se agregan módulos nuevos. Solo se aceptan:

- correcciones de bugs reales;
- mejoras de estabilidad;
- seguridad y aislamiento;
- ajustes de onboarding;
- documentación y soporte;
- mejoras comerciales que reduzcan fricción para captar o convertir clientes.

Las nuevas funciones se planifican para versiones posteriores.
