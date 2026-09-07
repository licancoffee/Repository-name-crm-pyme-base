export type CotizacionCliente = {
  nombre: string;
  empresa?: string;
  rut?: string;
  email: string;
  telefono?: string;
  localidad?: string;
  direccion?: string;
};

export type CotizacionItem = {
  sku?: string;
  producto: string;
  formato?: string;
  cantidad: number;
  precioUnitario: number;
};

export type CrearCotizacionPayload = {
  action: "crearCotizacion";
  cliente: CotizacionCliente;
  items: CotizacionItem[];
  descuento?: number;
  entrega?: string;
  formaPago?: string;
  documento?: string;
  observaciones?: string;
};

export type CotizacionEnvioResult = {
  ok: boolean;
  canal: "EMAIL";
  destinatario?: string;
  mensaje?: string;
  error?: string;
};

export type CrearCotizacionResult = {
  ok: boolean;
  numero?: string;
  estado?: string;
  total?: number;
  pdfUrl?: string;
  documentoUrl?: string;
  duplicada?: boolean;
  envio?: CotizacionEnvioResult;
  mensaje?: string;
  error?: string;
};
