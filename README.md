# Lican Sip & Sell

Crea una aplicación web móvil llamada “Lican Coffee CRM” para probar mañana desde un teléfono. Debe ser una primera versión funcional, rápida y clara, en español, con diseño profesional inspirado en café premium: fondo claro, tonos café, beige y acentos turquesa de la marca. Prioriza usabilidad móvil, botones grandes y navegación simple.

Objetivo de esta versión: permitir crear una venta de prueba sin afectar todavía el ERP real. Guardar datos en localStorage para que persistan en el navegador. No usar autenticación ni base de datos en esta primera versión.

Pantallas:
1. Inicio con accesos: Nueva venta, Clientes, Inventario, Historial.
2. Nueva venta:
- Buscar o seleccionar cliente existente.
- O crear cliente nuevo con nombre, teléfono, dirección/localidad y observación.
- Agregar múltiples productos desde catálogo.
- Mostrar producto, formato, precio IVA incluido, stock, cantidad y subtotal.
- Permitir editar cantidad y eliminar línea.
- Descuento opcional en pesos o porcentaje.
- Forma de pago: efectivo, transferencia, débito, crédito, pendiente.
- Observación de venta.
- Resumen visible: subtotal, descuento, total, costo estimado, utilidad neta estimada y margen estimado.
- Validar que no se pueda superar el stock disponible.
- Botón “Guardar venta de prueba”. Al guardar: generar ID único, fecha/hora, guardar en historial y descontar stock localmente.
- Botón “Comprobante WhatsApp” que abra wa.me con un texto ordenado con cliente, productos, cantidades, total y forma de pago. Usar teléfono del cliente si existe; si no, abrir sin destinatario.
- Bloquear doble clic mientras se procesa.
3. Clientes:
- Lista, buscador, ficha básica, total de compras y última compra según historial local.
4. Inventario:
- Lista de productos con stock y estado: OK, BAJO, CRÍTICO, SIN STOCK.
- Buscador y filtros por categoría.
5. Historial:
- Lista de ventas guardadas, detalle, total, forma de pago y botón para reenviar comprobante por WhatsApp.
- Permitir anular una venta de prueba y devolver automáticamente el stock, dejando registro de estado ANULADA.

Catálogo inicial exacto:
- Chocolate | Mezclas | 1 kg | costo neto 3706 | precio 11900 | stock 29.5 | mínimo 3
- Cappuccino Tradicional | Mezclas | 1 kg | costo neto 4874 | precio 12900 | stock 16 | mínimo 3
- Cappuccino Vainilla | Mezclas | 1 kg | costo neto 4748 | precio 12900 | stock 9 | mínimo 3
- Mokachino | Mezclas | 1 kg | costo neto 4555 | precio 12900 | stock 10 | mínimo 3
- Té Chai | Mezclas | 1 kg | costo neto 3756 | precio 13500 | stock 12 | mínimo 3
- Crema Sabor Leche | Mezclas | 1 kg | costo neto 3706 | precio 11900 | stock 7 | mínimo 5
- Cappuccino Avellana | Mezclas | 1 kg | costo neto 5500 | precio 12900 | stock 20 | mínimo 3
- Cappuccino Trufa | Mezclas | 1 kg | costo neto 5500 | precio 12900 | stock 10 | mínimo 3
- Cruzeiro Clásico Instantáneo | Café soluble | 500 g | costo neto 7065 | precio 14900 | stock 22 | mínimo 6
- Patagonia Intenso | Café grano/molido | 1 kg | costo neto 18044 | precio 34990 | stock 1 | mínimo 1
- Patagonia Intenso Grano | Café grano | 250 g | costo neto 6129 | precio 11990 | stock 2 | mínimo 1
- Patagonia Intenso Molido | Café molido | 250 g | costo neto 6129 | precio 11990 | stock 0 | mínimo 1
- Santa Rosa | Café grano/molido | 1 kg | costo neto 17746 | precio 34990 | stock 1 | mínimo 1
- Santa Rosa Grano | Café grano | 250 g | costo neto 5783 | precio 10990 | stock 2 | mínimo 1
- Santa Rosa Molido | Café molido | 250 g | costo neto 5783 | precio 10990 | stock 2 | mínimo 1
- Manizales Grano | Café grano | 250 g | costo neto 5037 | precio 10990 | stock 2 | mínimo 1
- Manizales Molido | Café molido | 250 g | costo neto 5037 | precio 10990 | stock 1 | mínimo 1
- Los Andes Grano | Café grano | 250 g | costo neto 4444 | precio 11990 | stock 2 | mínimo 1
- Los Andes Molido | Café molido | 250 g | costo neto 4444 | precio 11990 | stock 0 | mínimo 1
- Revolvedores | Insumos | Caja 1.000 unidades | costo neto 3000 | precio 5490 | stock 10 cajas | mínimo 2

Cliente inicial para prueba:
- María José — Espacio Blue
- Teléfono: 920376351
- Dirección: Vicente Reyes 794, Villarrica

Formato monetario chileno sin decimales, excepto stock que puede tener decimales. El margen debe calcularse sobre venta neta sin IVA: precio bruto / 1,19; utilidad neta = venta neta - costo neto. Si hay descuento, distribuirlo proporcionalmente entre líneas para estimar utilidad y margen.

Incluye una advertencia visible en la cabecera: “MODO PRUEBA — No registra en el ERP real”.

Debe quedar totalmente navegable y usable en móvil y escritorio. Usa React, TypeScript, Tailwind y componentes shadcn/ui. No dejes botones de muestra sin funcionar.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/22f8683f-ddb9-4301-9766-4e6ff950e762).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
