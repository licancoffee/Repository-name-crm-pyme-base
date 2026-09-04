# CRM PyME Base — Checklist de certificación V1.0

## Arquitectura objetivo

Cada empresa se identifica por un `CLIENT_ID` único, derivado normalmente de su RUT (`CL-<RUT_NORMALIZADO>`).

El CRM central utiliza:

- `SETUP_STORAGE_URL`
- `SETUP_STORAGE_TOKEN`

El token anterior protege únicamente el backend central del instalador. No es una credencial operativa de cada empresa.

Cada empresa operativa utiliza:

- `CLIENT_ID`
- `ERP_APPS_SCRIPT_URL`

El backend operativo V3 valida que el `CLIENT_ID` recibido coincida exactamente con el `CLIENT_ID` configurado en Script Properties.

## Apps Script central

Usar:

`docs/apps-script/CRM_PYME_Installer_Backend_v5.gs`

Script Properties requeridas:

- `SETUP_STORAGE_TOKEN`
- `SETUP_SPREADSHEET_ID`

La hoja `CLIENT_CONNECTIONS` conserva la columna histórica `CRM_API_TOKEN` por compatibilidad estructural, pero V5 guarda `NO_REQUERIDO` y no depende de ella.

## Apps Script operativo de cada empresa

Usar:

`docs/apps-script/CRMBaseOperativoV3.gs`

Script Properties requeridas:

- `CLIENT_ID`
- `SETUP_SPREADSHEET_ID`
- `OPERATIONAL_SPREADSHEET_ID`

Opcional:

- `QUOTES_FOLDER_ID`

No configurar `CRM_API_TOKEN` para una instalación V3 nueva.

## Orden de instalación de una empresa nueva

1. Abrir `/setup?mode=new`.
2. Registrar empresa y guardar configuración.
3. Confirmar el `CLIENT_ID` generado.
4. Cargar productos.
5. Cargar al menos un cliente inicial.
6. Crear/seleccionar la planilla operativa de esa empresa.
7. Crear proyecto Apps Script operativo con `CRMBaseOperativoV3.gs`.
8. Configurar Script Properties con el `CLIENT_ID` exacto.
9. Implementar como Web App y obtener URL `/exec`.
10. Abrir Paso 4 del instalador.
11. Guardar la URL `/exec`.
12. El instalador debe ejecutar ping con `CLIENT_ID` y mostrar conexión verificada.
13. Solo entonces el Centro de instalación puede mostrar `Instalación completa`.

## Prueba de identidad obligatoria

Con el backend operativo configurado para Empresa A:

- ping con `CLIENT_ID` de Empresa A: debe responder `ok:true`.
- ping con `CLIENT_ID` de Empresa B: debe responder `ok:false` / `CLIENT_ID_INCORRECTO`.

Una conexión no debe guardarse si el backend responde con otro `CLIENT_ID`.

## Prueba de venta

1. Registrar stock inicial conocido, por ejemplo 10 unidades.
2. Abrir el CRM con el `CLIENT_ID` de la empresa.
3. Crear una venta de 2 unidades.
4. Confirmar respuesta exitosa.
5. Confirmar `CRM_VENTAS`.
6. Confirmar `CRM_VENTAS_ITEMS`.
7. Confirmar movimiento `SALIDA_VENTA`.
8. Confirmar inventario final = 8.
9. Sincronizar CRM y confirmar que historial y stock coincidan con ERP.

## Prueba de anulación

1. Anular la venta anterior.
2. Confirmar estado `ANULADA`.
3. Confirmar movimiento `ENTRADA_ANULACION`.
4. Confirmar inventario restaurado a 10.
5. Repetir anulación y confirmar idempotencia: no debe duplicar reposición.

## Prueba de cotización

1. Crear una cotización con cliente válido.
2. Confirmar registro en `CRM_COTIZACIONES`.
3. Confirmar registro en `CRM_COTIZACIONES_ITEMS`.
4. Confirmar estado `GENERADA_SIN_ENVIO`.
5. Confirmar PDF y documento si Drive está autorizado.
6. Confirmar que generar la cotización no descuente stock.
7. Convertir la cotización en venta.
8. Confirmar estado `CONVERTIDA` y `VENTA_ID` asociado.
9. Confirmar que solo la venta descuente inventario.

## Prueba multiempresa obligatoria

Crear Empresa A y Empresa B con distinto `CLIENT_ID`.

Verificar:

- productos A no aparecen en B;
- clientes A no aparecen en B;
- stock A no aparece en B;
- ventas A no aparecen en B;
- cotizaciones A no aparecen en B;
- una URL operativa de A no puede aprobar el Paso 4 para B;
- el navegador usa namespaces de caché separados `crm-pyme-v4:<clientId>`.

## Prueba PC + celular

Con la misma empresa:

1. Abrir CRM en PC.
2. Abrir CRM en celular.
3. Registrar venta desde uno de los dispositivos.
4. Sincronizar en el otro.
5. Confirmar misma venta, mismo stock e historial.

## Criterio de aprobación V1.0

CRM PyME Base se considera listo para V1.0 únicamente si:

- los cuatro pasos del instalador están completos;
- `operationalReady === true`;
- venta y anulación actualizan inventario correctamente;
- cotización y conversión funcionan;
- no existe contaminación de datos entre dos `CLIENT_ID`;
- PC y celular reflejan el mismo backend;
- no se requiere `CRM_API_TOKEN` por empresa nueva;
- `SETUP_STORAGE_TOKEN` permanece privado y solo protege el instalador central.
