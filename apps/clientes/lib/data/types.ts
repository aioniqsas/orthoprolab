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

export interface PacienteConCedula extends Paciente {
  cedula: string | null;
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
  codigo?: string;
  nombre: string;
  color: string | null;
}

export interface DetalleOrden {
  id: string;
  servicioId: string;
  servicio: Pick<Servicio, "id" | "nombre" | "precio">;
  cantidad: number;
  precioUnitario: string;
  dientes?: number[];
  colorDiente?: string | null;
  observaciones: string | null;
}

export interface HistorialEstadoOrden {
  id: string;
  estadoAnterior: { id: string; nombre: string; color: string | null } | null;
  estadoNuevo: { id: string; nombre: string; color: string | null };
  fechaCambio: string;
  observaciones?: string | null;
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
  // Populated in detail view (getOrden) — maps to entity relation `historial`
  historial?: HistorialEstadoOrden[];
}

// ─── Cuenta de cobro ───────────────────────────────────────────────────────

export type EstadoCuentaCobro =
  | "borrador"
  | "emitida"
  | "pagada"
  | "pagada_parcial"
  | "anulada";

export interface CuentaCobro {
  id: string;
  numero: string;
  clinicaId: string;
  estado: EstadoCuentaCobro;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  total: string;
  pdfUrl: string | null;
  observaciones: string | null;
  creadaEn: string;
}

export interface Pago {
  id: string;
  monto: string;
  fechaPago: string;
  metodo: string;
  referencia: string | null;
  notas: string | null;
  comprobanteUrl: string | null;
  comprobanteNombre: string | null;
  anulado: boolean;
  createdAt: string;
}

export interface CuentaCobroDetalle extends CuentaCobro {
  pagos: Pago[];
}

export interface MetodoPagoBancario {
  id: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  qrUrl: string | null;
}

// ─── PacienteDoctor (from listPacientesDelDoctor) ──────────────────────────

export interface PacienteDoctor {
  pacienteId: string;
  doctorId: string;
  paciente: Paciente;
  fechaAsignacion: string;
}
