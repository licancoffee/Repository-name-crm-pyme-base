import { createServerFn } from "@tanstack/react-start";

/** Lectura del ERP (Google Sheets) — solo lectura, sin escritura. */
export const getErpSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const { readErpSnapshot } = await import("./sheets.server");
  return readErpSnapshot();
});
