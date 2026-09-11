# Kaizu — Sistema de ventas y gestión para pequeños negocios

**Kaizu** es una aplicación web multiempresa desarrollada por Lican Coffee SpA para gestión comercial de pequeñas y medianas empresas. La V1 está orientada a ventas, clientes, inventario, cotizaciones y operación desde PC o móvil.

**Ordena. Vende. Crece.**

## Estado

**Kaizu V1 comercial certificada.**

La versión actual fue validada con una empresa de prueba independiente y un piloto comercial, incluyendo instalación, operación, aislamiento por empresa, navegación PC/móvil y flujo completo de cotizaciones y ventas.

## Alcance funcional V1

- Dashboard comercial.
- Gestión de clientes.
- Inventario y control de stock.
- Nueva venta y descuento de inventario.
- Historial de ventas.
- Anulación de venta con devolución de stock.
- Protección contra doble anulación.
- Nueva cotización.
- Historial de cotizaciones.
- PDF de cotización.
- Envío por correo con PDF adjunto.
- Reenvío de cotización sin duplicarla.
- Compartición por WhatsApp.
- Conversión de cotización a venta.
- Instalador multiempresa de 4 pasos.
- Identidad separada por `CLIENT_ID`.
- Operación responsive en PC y móvil.
- Generador administrativo de pilotos comerciales de 7 días.
- Seguimiento comercial y contador regresivo de pilotos.

## Arquitectura

El producto separa configuración e instalación de la operación de cada empresa:

1. **Instalador central**: registra empresa, productos, clientes y conexión operativa.
2. **Frontend Kaizu**: aplicación React/TypeScript desplegada en Vercel.
3. **Backend operativo por empresa**: Google Apps Script.
4. **Hoja operativa por empresa**: Google Sheets para ventas, inventario, movimientos y cotizaciones.
5. **Aislamiento**: cada backend valida estrictamente su `CLIENT_ID`.

Las nuevas instalaciones no requieren un `CRM_API_TOKEN` operativo por empresa. El instalador central mantiene su propia protección mediante `SETUP_STORAGE_TOKEN`.

## Backend operativo

Versión certificada: **V4 / 1.4.0**

Archivo completo:

`docs/apps-script/CRMBaseOperativoV4.gs`

El backend V4 incluye ventas, anulaciones, inventario, movimientos, cotizaciones, PDF, correo, reenvío y conversión a venta.

## Instalación de una nueva PyME

El flujo comercial de instalación es:

1. Empresa.
2. Productos.
3. Clientes.
4. Conexión operativa.

Kaizu solo se considera listo cuando los cuatro pasos están completos y la conexión operativa valida el `CLIENT_ID` correcto.

Ver procedimiento detallado en:

`docs/ONBOARDING_CLIENTE_V1.md`

## Pilotos comerciales

Generador Kaizu:

`docs/apps-script/KaizuPilotGeneratorV1.gs`

Automatización de estados:

`docs/apps-script/KaizuPilotStatusAutomationV1.gs`

Flujo comercial recomendado:

**Prospecto → Demo de 10 minutos → Piloto individual de 7 días → Cliente pagado**

## Certificación V1

La V1 fue probada en los siguientes puntos críticos:

- Venta → items → movimiento → inventario.
- Anulación → reposición de stock.
- Doble anulación sin doble reposición.
- Cotización sin afectar inventario.
- Generación de PDF.
- Envío de correo.
- Reenvío de correo.
- WhatsApp con identidad de empresa correcta.
- Conversión cotización → venta.
- Rechazo de `CLIENT_ID` incorrecto.
- Navegación con identidad persistente.
- Perfil escritorio.
- Perfil móvil.
- Typecheck y build.

Checklist técnico:

`docs/CRM_PYME_CHECKLIST_V1.md`

Definición comercial:

`docs/PRODUCTO_COMERCIAL_V1.md`

## Regla de mantenimiento V1

La V1 queda en **congelamiento funcional**. No se agregan módulos nuevos durante la etapa inicial de comercialización. Solo se aceptan:

- correcciones de bugs reales;
- mejoras de estabilidad;
- ajustes de onboarding;
- seguridad y aislamiento;
- documentación y soporte;
- mejoras comerciales que reduzcan fricción de venta.

Las nuevas funciones deben planificarse para una versión posterior.

## Desarrollo

Requisitos:

- Node.js 22+
- npm

```sh
git clone https://github.com/licancoffee/Repository-name-crm-pyme-base.git
cd Repository-name-crm-pyme-base
npm ci
npx tsc --noEmit
npm run build
npm run dev
```

## Rama de trabajo y checkpoint

Rama operativa certificada:

`respaldo-instalador-avanzado`

Checkpoint histórico de cierre técnico:

`checkpoint-crm-pyme-base-v1-comercial-20260907`

---

**Kaizu V1 — sistema de ventas y gestión configurable y comercializable para PyMEs.**
