export type KaizenIntent =
  | "CONSULTAR_STOCK"
  | "CONSULTAR_PRECIO"
  | "BUSCAR_CLIENTE"
  | "CONSULTAR_VENTAS"
  | "CONSULTAR_COTIZACIONES"
  | "CREAR_COTIZACION"
  | "PREPARAR_VENTA"
  | "DESCONOCIDO";

export type KaizenPermission =
  | "LECTURA"
  | "REQUIERE_CONFIRMACION";

export interface KaizenRequest {
  message: string;
}

export interface KaizenResponse {
  ok: boolean;
  message: string;
  intent?: KaizenIntent;
  permission?: KaizenPermission;
  data?: unknown;
  error?: string;
}

export interface KaizenToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  message?: string;
  error?: string;
}