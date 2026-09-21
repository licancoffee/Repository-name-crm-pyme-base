# Kaizu CRM WhatsApp — piloto V2 (20-09-2026)

## Decisión y aislamiento
La V1 comercial permanece congelada. Esta exploración existe SOLO en la rama `feature/kaizu-crm-whatsapp-v2`; no modifica la rama operativa `respaldo-instalador-avanzado`, la instalación real de Lican Coffee, Google Apps Script, Google Sheets, el dominio ni el ERP.

Se creó `public/kaizu-crm-whatsapp-piloto.html`: prototipo HTML/CSS/JS independiente. Cuando se publique ESTA rama en un preview de Vercel, abrir `/kaizu-crm-whatsapp-piloto.html` en esa URL temporal. No implica que esté disponible actualmente en app.kaizu.cl.

## Alcance implementado
- Captura manual de oportunidad comercial: nombre, celular chileno, origen, producto de interés, monto estimado, etapa, siguiente seguimiento, notas.
- Edición, eliminación, búsqueda, filtro y contadores.
- Detección básica de duplicados por celular; nombre sin teléfono no se desduplica.
- Botón de WhatsApp mediante wa.me SOLO para celular válido, texto sugerido y envío manual.
- Persistencia única en localStorage del navegador; no es un sistema multiusuario ni una base de datos compartida.
- Sin lectura de chats, sincronización de WhatsApp, mensajería automática, cotización PDF, inventario, ni vínculo ERP. No afirma conexión oficial de Meta.

## Uso y aceptación de piloto
1. Abrir HTML localmente o con preview de la rama, usando exclusivamente datos ficticios.
2. Crear tres contactos: Marketplace / Instagram / WhatsApp; dos con teléfono válido.
3. Confirmar que duplicar teléfono no crea otra oportunidad; editar etapa y programar seguimiento.
4. Verificar filtros, resultados, total abierto y ganado. Revisar seguimiento hoy y anterior.
5. Abrir enlace WhatsApp y comprobar que el sistema NO envía por sí solo.
6. Recargar y comprobar persistencia en el mismo navegador, luego borrar contacto de prueba.
7. Probar en móvil y escritorio, en navegador con almacenamiento bloqueado y con datos mal formados.
8. No marcar el piloto aprobado hasta ejecutar pruebas manuales y revisar el build desde el preview.

## Condiciones antes de ofrecer como SaaS o habilitar con datos reales
- Autenticación y autorización por usuario/empresa, no confiar en clientId por URL como control de seguridad.
- Almacenamiento compartido con políticas de acceso por tenant, respaldo/recuperación, historial de cambios y protección de datos.
- Consentimiento y finalidades de tratamiento de datos; controles de acceso y retención.
- Integrar con el modelo de clientes del ERP mediante ID estable; no duplicar ficha comercial ni grabar ventas por solo cambiar etapa.
- Separar oportunidad de cotización; usar conversión confirmada desde backend para venta y stock.
- API oficial WhatsApp Business Cloud API únicamente si hay caso de negocio; revisar tarifas y ventanas de atención vigentes.
- Respetar la regla de no tocar producción sin diagnóstico, respaldo, pruebas y autorización.

## Métricas para validación en Lican Coffee
- Consultas registradas / consultas reales (captura manual).
- Cotizaciones / consultas.
- Ventas confirmadas / cotizaciones.
- Oportunidades con seguimiento vencido.
- Tiempo desde consulta a primer contacto, cuando se registre de manera fiable.
- Ingreso atribuible confirmado desde ERP, jamás sumar montos de oportunidades como ventas.

## Próximo incremento sugerido
Crear rutas React bajo bandera de función `crmWhatsApp` y endpoints persistentes multiempresa, luego vista de tareas y un historial de actividades. Mantener el enlace manual mientras no esté conectada API oficial.

**Estado:** prototipo inicial escrito en rama de desarrollo; no probado contra producción ni desplegado a dominio comercial.
