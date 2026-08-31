export const clp = (n: number) =>
  "$" + Math.round(n || 0).toLocaleString("es-CL", { maximumFractionDigits: 0 });

export const qtyFmt = (n: number) =>
  (n || 0).toLocaleString("es-CL", { maximumFractionDigits: 2 });

export const pct = (n: number) =>
  (Number.isFinite(n) ? n * 100 : 0).toLocaleString("es-CL", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }) + "%";

export const dateFmt = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
