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
})
  .validator(
    (data: {
      clientId?: string;
    } = {}) => data,
  )
  .handler(async ({ data }) => {
    const {
      readOperationalSnapshot,
    } = await import(
      "./operational.server"
    );

    return readOperationalSnapshot(
      data.clientId,
    );
  });
