# Onboarding Cliente — CRM Comercial PyME Base V1

Este procedimiento se usa para instalar una nueva PyME sin mezclar datos, credenciales ni operación entre clientes.

## Objetivo

Dejar una empresa operativa con:

- identidad propia;
- productos;
- clientes;
- backend operativo;
- hoja operativa;
- ventas;
- inventario;
- cotizaciones;
- PDF;
- correo;
- WhatsApp;
- conversión de cotización a venta.

## Información mínima a solicitar al cliente

### Empresa

- Nombre comercial.
- Razón social.
- RUT.
- Correo.
- Teléfono.
- Dirección.
- Ciudad.
- Sitio web, si existe.
- Logo, si se utilizará.

### Productos

Por producto:

- Nombre.
- Categoría.
- Unidad física de stock.
- Kg por unidad si aplica.
- Costo neto.
- Stock inicial.
- Stock mínimo.
- Formato de venta.
- Unidades que descuenta del inventario.
- Precio lista.
- Precio preferente, si aplica.

### Clientes

Por cliente inicial:

- Nombre.
- Teléfono / WhatsApp.
- Dirección.
- Tipo de precio.
- Observación opcional.

## Instalación — 4 pasos

### 1. Empresa

Abrir el instalador en modo nueva empresa.

Completar los datos y guardar.

Confirmar el `CLIENT_ID` generado. Ese identificador debe acompañar toda la instalación.

No continuar si la empresa no aparece guardada correctamente.

### 2. Productos

Abrir el paso Productos con el mismo `clientId`.

Cargar el catálogo inicial y guardar.

Verificar:

- productos válidos;
- precios correctos;
- stock inicial correcto;
- stock mínimo correcto;
- formatos correctos.

### 3. Clientes

Abrir el paso Clientes con el mismo `clientId`.

Cargar al menos un cliente de prueba y guardar.

### 4. Conexión operativa

Crear una hoja Google Sheets exclusiva para la empresa.

Crear o abrir su Apps Script vinculado.

Usar como backend completo:

`docs/apps-script/CRMBaseOperativoV4.gs`

Configurar Script Properties:

- `CLIENT_ID`
- `SETUP_SPREADSHEET_ID`
- `OPERATIONAL_SPREADSHEET_ID`

Opcional:

- `QUOTES_FOLDER_ID`

No agregar `CRM_API_TOKEN` en instalaciones V1 nuevas.

## Despliegue Apps Script

1. Reemplazar completamente `Código.gs` por `CRMBaseOperativoV4.gs`.
2. Guardar.
3. Implementar como Aplicación web.
4. Ejecutar como propietario de la instalación.
5. Permitir acceso según la configuración operativa definida para el producto.
6. Copiar la URL terminada en `/exec`.
7. Guardarla en el paso Conexión operativa del instalador.

Para una actualización de una empresa existente:

- editar la implementación existente;
- seleccionar Nueva versión;
- mantener la misma URL `/exec`.

## Autorización de correo

El backend V4 usa MailApp para enviar la cotización con PDF adjunto.

En una instalación nueva, si Google todavía no ha autorizado el permiso de correo, ejecutar una vez una función de autorización controlada o una operación que solicite el permiso y aceptar los permisos con la cuenta propietaria del Apps Script.

Después, validar cuota disponible y hacer una cotización real de prueba.

## Certificación obligatoria antes de entregar

### Conectividad

- `ping` responde `ok:true`.
- versión del backend: `1.4.0`.
- `clientId` devuelto coincide exactamente con el cliente.
- un `CLIENT_ID` incorrecto debe ser rechazado.

### Venta

Crear una venta de prueba.

Comprobar:

- venta registrada;
- item registrado;
- movimiento `SALIDA_VENTA`;
- stock descontado una sola vez;
- venta visible en Historial.

### Anulación

Anular la venta de prueba.

Comprobar:

- estado `ANULADA`;
- movimiento de reposición;
- stock restaurado;
- una segunda anulación no repone stock nuevamente.

### Cotización

Crear una cotización de prueba.

Comprobar:

- cotización registrada;
- item registrado;
- PDF correcto;
- correo recibido con PDF adjunto;
- estado `ENVIADA` si el correo fue exitoso;
- stock sin cambios.

### WhatsApp

Abrir WhatsApp desde la cotización.

Comprobar:

- teléfono correcto;
- nombre de empresa correcto;
- número de cotización correcto;
- detalle y total correctos;
- nunca debe aparecer `EMPRESA DEMO`.

### Conversión

Convertir la cotización en venta.

Comprobar:

- nueva venta creada;
- stock descontado;
- movimiento creado;
- cotización marcada `CONVERTIDA`;
- venta asociada a la cotización.

### PC y móvil

Abrir con el `clientId` de la empresa y recorrer:

- Inicio;
- Venta;
- Cotizaciones;
- Clientes;
- Stock;
- Historial.

Comprobar que la empresa correcta se mantiene durante toda la navegación.

## Entrega al cliente

Entregar solamente cuando todas las pruebas anteriores estén aprobadas.

Registrar internamente:

- empresa;
- RUT;
- CLIENT_ID;
- Spreadsheet operativo;
- Apps Script operativo;
- URL `/exec`;
- fecha de instalación;
- versión instalada;
- responsable de instalación;
- resultado de certificación.

No entregar al cliente el `SETUP_STORAGE_TOKEN` del instalador central.

## Política V1

Durante la comercialización inicial:

- no agregar módulos nuevos durante una instalación;
- no personalizar código por cliente si puede resolverse por configuración;
- no mezclar planillas o backends entre empresas;
- no crear archivos `.gs` duplicados dentro del Apps Script;
- no alterar una instalación certificada para probar funciones experimentales.

Las solicitudes nuevas deben registrarse para una versión posterior.
