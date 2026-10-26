// ─── Doctor ────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  clinicaId: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  activo: boolean;
}

// ─── Paciente ──────────────────────────────────────────────────────────────

export interface Paciente {
  id: string;
  nombre: string;
}

// ─── Servicio ──────────────────────────────────────────────────────────────

export interface Servicio {
  id: string;
  nombre: string;
  precio: string;
  activo: boolean;
}

// ─── Orden ─────────────────────────────────────────────────────────────────

export interface EstadoOrden {
  id: string;
  nombre: string;
  color: string | null;
}

export interface DetalleOrden {
  id: string;
  servicioId: string;
  servicio: Pick<Servicio, "id" | "nombre" | "precio">;
  cantidad: number;
  precioUnitario: string;
  observaciones: string | null;
}

export interface Orden {
  id: string;
  doctorId: string;
  pacienteId: string;
  estadoId: string;
  estado: EstadoOrden;
  valor: string;
  urgente: boolean;
  fechaCreacion: string;
  fechaEntrega: string | null;
  // Populated in detail view (getOrden)
  asignacion: {
    doctor: Pick<Doctor, "id" | "nombres" | "apellidos"> | null;
    paciente: Paciente | null;
  } | null;
  detalles: DetalleOrden[];
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

// ─── PacienteDoctor (from listPacientesDelDoctor) ──────────────────────────

export interface PacienteDoctor {
  pacienteId: string;
  doctorId: string;
  paciente: Paciente;
  fechaAsignacion: string;
}
