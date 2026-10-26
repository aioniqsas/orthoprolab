// ─── Doctor ────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  clinicaId: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  activo: boolean;
}

// ─── Orden ─────────────────────────────────────────────────────────────────

export interface EstadoOrden {
  id: string;
  nombre: string;
  color: string | null;
}

export interface Orden {
  id: string;
  doctorId: string;
  doctor: Pick<Doctor, "id" | "nombres" | "apellidos"> | null;
  estadoId: string;
  estado: EstadoOrden;
  precio: string;
  urgente: boolean;
  fechaCreacion: string;
  fechaEntrega: string | null;
}

// ─── Cuenta de cobro ───────────────────────────────────────────────────────

export type EstadoCuentaCobro =
  | "borrador"
  | "emitida"
  | "pagada"
  | "pago_parcial"
  | "anulada";

export interface CuentaCobro {
  id: string;
  numero: string;
  clinicaId: string;
  estado: EstadoCuentaCobro;
  fechaEmision: string;
  fechaVencimiento: string | null;
  total: string;
  pdfUrl: string | null;
  observaciones: string | null;
  creadaEn: string;
}
