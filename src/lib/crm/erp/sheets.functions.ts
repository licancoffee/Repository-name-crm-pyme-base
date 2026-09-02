import { createServerFn } from "@tanstack/react-start";

/**
 * Lectura del backend operativo del CRM Base.
 *
 * Esta capa conserva los códigos originales de producto y utiliza
 * directamente el inventario, formatos, clientes y ventas devueltos
 * por la Web App operativa de cada cliente.
 */
export const getErpSnapshot = createServerFn({
  method: "GET",
}).handler(async () => {
  const {
    readOperationalSnapshot,
  } = await import(
    "./operational.server"
  );

  return readOperationalSnapshot();
});
