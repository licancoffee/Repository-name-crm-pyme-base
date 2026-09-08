# CRM PyME Base — Checklist de certificación V1.0

## Estado

**V1.0 certificada para inicio de comercialización controlada.**

## Arquitectura objetivo

Cada empresa se identifica por un `CLIENT_ID` único, derivado normalmente de su RUT (`CL-<RUT_NORMALIZADO>`).

El instalador central utiliza:

- `SETUP_STORAGE_URL`
- `SETUP_STORAGE_TOKEN`

Ese token protege únicamente el backend central del instalador. No es una credencial operativa de cada empresa.

Cada empresa operativa utiliza:

- `CLIENT_ID`
- `ERP_APPS_SCRIPT_URL`

El backend operativo V4 valida que el `CLIENT_ID` recibido coincida exactamente con el configurado en Script Properties.

## Apps Script central

Usar:

`docs/apps-script/CRM_PYME_Installer_Backend_v5.gs`

Script Properties requeridas:

- `SETUP_STORAGE_TOKEN`
- `SETUP_SPREADSHEET_ID`

La hoja `CLIENT_CONNECTIONS` conserva la columna histórica `CRM_API_TOKEN` por compatibilidad estructural, pero V5 guarda `NO_REQUERIDO` y no depende de ella.

## Apps Script operativo de cada empresa

Usar:

`docs/apps-script/CRMBaseOperativoV4.gs`

Versión certificada:

`1.4.0`

Script Properties requeridas:

- `CLIENT_ID`
- `SETUP_SPREADSHEET_ID`
- `OPERATIONAL_SPREADSHEET_ID`

Opcional:

- `QUOTES_FOLDER_ID`

No configurar `CRM_API_TOKEN` para una instalación V1 nueva.

## Orden de instalación de una empresa nueva

1. Abrir `/setup?mode=new`.
2. Registrar empresa y guardar configuración.
3. Confirmar el `CLIENT_ID` generado.
4. Cargar productos.
5. Cargar al menos un cliente inicial.
6. Crear/seleccionar la planilla operativa de esa empresa.
7. Crear proyecto Apps Script operativo con `CRMBaseOperativoV4.gs`.
8. Configurar Script Properties con el `CLIENT_ID` exacto.
9. Implementar como Web App y obtener URL `/exec`.
10. Abrir Paso 4 del instalador.
11. Guardar la URL `/exec`.
12. El instalador debe ejecutar ping con `CLIENT_ID` y mostrar conexión verificada.
13. Solo entonces el Centro de instalación puede mostrar `Instalación completa`.

## Prueba de identidad obligatoria — APROBADA

Con el backend operativo configurado para Empresa A:

- ping con `CLIENT_ID` de Empresa A: `ok:true`.
- ping con `CLIENT_ID` de Empresa B: rechazado con identidad incorrecta.

Una conexión no debe guardarse si el backend responde con otro `CLIENT_ID`.

## Prueba de venta — APROBADA

1. Registrar stock inicial conocido.
2. Abrir el CRM con el `CLIENT_ID` de la empresa.
3. Crear una venta.
4. Confirmar respuesta exitosa.
5. Confirmar `CRM_VENTAS`.
6. Confirmar `CRM_VENTAS_ITEMS`.
7. Confirmar movimiento `SALIDA_VENTA`.
8. Confirmar descuento de inventario.
9. Sincronizar CRM y confirmar historial y stock.

## Prueba de anulación — APROBADA

1. Anular una venta activa.
2. Confirmar estado `ANULADA`.
3. Confirmar movimiento `ENTRADA_ANULACION`.
4. Confirmar inventario restaurado.
5. Repetir anulación y confirmar idempotencia: no debe duplicar reposición.

Resultado de prueba final de doble anulación: aprobado.

## Prueba de cotización — APROBADA

1. Crear una cotización con cliente válido.
2. Confirmar `CRM_COTIZACIONES`.
3. Confirmar `CRM_COTIZACIONES_ITEMS`.
4. Confirmar PDF.
5. Confirmar que generar cotización no descuente stock.
6. Enviar por correo y confirmar PDF adjunto.
7. Confirmar estado `ENVIADA` tras envío exitoso.
8. Si el correo falla, conservar cotización y PDF como `GENERADA_SIN_ENVIO`.
9. Reenviar una cotización existente sin duplicarla.
10. Abrir WhatsApp con empresa, teléfono, detalle y total correctos.
11. Convertir cotización a venta.
12. Confirmar estado `CONVERTIDA` y `VENTA_ID` asociado.
13. Confirmar que solo la venta descuente inventario.

## Prueba multiempresa — APROBADA

Verificar:

- backend rechaza un `CLIENT_ID` incorrecto;
- identidad visual corresponde a la empresa activa;
- WhatsApp usa la empresa activa y nunca `EMPRESA DEMO`;
- navegación conserva `clientId`;
- la identidad persiste incluso al entrar posteriormente a rutas sin query explícita.

## Prueba PC + móvil — APROBADA

Certificación automatizada final:

- PC: 1440 × 900.
- Móvil: 390 × 844.

Rutas recorridas:

- Inicio.
- Venta.
- Cotizaciones.
- Clientes.
- Stock.
- Historial.

Resultados:

- `PC_OK`
- `MOVIL_OK`
- `PC_MOVIL_NAVEGACION_IDENTIDAD_OK`

## Calidad de build — APROBADA

- TypeScript `npx tsc --noEmit`: verde.
- Build de producción: verde.
- CI final: verde.

## Criterio de aprobación V1.0

CRM PyME Base se considera listo para V1.0 porque:

- los cuatro pasos del instalador están completos;
- `operationalReady === true`;
- venta y anulación actualizan inventario correctamente;
- doble anulación no repone stock dos veces;
- cotización, PDF, correo, WhatsApp y conversión funcionan;
- el backend rechaza identidades incorrectas;
- navegación PC/móvil mantiene la empresa activa;
- no se requiere `CRM_API_TOKEN` por empresa nueva;
- `SETUP_STORAGE_TOKEN` permanece privado y solo protege el instalador central;
- typecheck y build están verdes.

## Regla posterior a certificación

La V1 queda en congelamiento funcional durante el inicio de comercialización.

Solo se aceptan:

- bugs reales;
- estabilidad;
- seguridad y aislamiento;
- onboarding;
- documentación y soporte.

Las nuevas funciones deben pasar a una versión posterior.
