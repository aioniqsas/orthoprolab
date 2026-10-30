/**
 * Domain types mirroring `apps/api/docs/database-model.md`.
 * Monetary values are numeric STRINGS with 2 decimals, exactly like
 * `numeric(12,2)` columns serialized by the API. Dates are ISO 8601 strings.
 */

export const ESTADOS_ORDEN = [
  "creada",
  "recibida",
  "en_proceso",
  "cancelada",
  "en_entrega",
  "devuelta_correccion",
  "terminada",
] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

/** Reference row for a `estado_orden` entry (used in the state change form). */
export interface EstadoOrdenItem {
  id: string;
  codigo: string;
  nombre: string;
}

/** Standalone doctor (no login; belongs to a clinic). */
export interface Doctor {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  clinicaId: string;
  activo: boolean;
}

/** Reference to a patient (`paciente`). */
export interface Paciente {
  id: number;
  nombre: string;
}

export interface DetalleOrden {
  id: number;
  servicio: string;
  cantidad: number;
  /** Historical price copied from `servicio.precio`, numeric string. */
  precioUnitario: string;
  /** FDI-numbered teeth covered by this line, each with its shade. */
  dientes: { numero: number; color: string }[];
  observaciones: string | null;
}

/** Append-only row of `historial_estado_orden`. */
export interface HistorialEstado {
  id: number;
  estadoAnterior: EstadoOrden | null;
  estadoNuevo: EstadoOrden;
  /** Display name of the user who made the change. */
  usuario: string;
  fechaCambio: string;
  observaciones: string | null;
}

export interface Orden {
  id: number;
  doctor: Doctor;
  paciente: Paciente;
  estado: EstadoOrden;
  /** The numeric DB primary key of the current `estado_orden` row (string because the API uses bigint identity). */
  estadoDbId: string;
  /** Numeric string with 2 decimals; equals the sum of the line subtotals. */
  valor: string;
  urgente: boolean;
  fechaCreacion: string;
  fechaEntrega: string | null;
  detalles: DetalleOrden[];
  historial: HistorialEstado[];
}

export interface Clinica {
  id: number;
  nombre: string;
  correo: string | null;
  direccion: string | null;
  doctores: Doctor[];
  /** Populated from the list endpoint (GET /clinicas); undefined when loaded via detail. */
  doctorCount?: number;
}

/** Clinic row when loaded with its full doctor list (GET /clinicas/:id). */
export interface ClinicaDetalle extends Clinica {}

export const ROLES = ["administrador", "clinica"] as const;
export type RolNombre = (typeof ROLES)[number];

/**
 * Staff/user row (`usuario` joined with `rol`). Never carries `password_hash`
 * nor the clear `cedula`: only the masked value reaches the UI.
 */
export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: RolNombre;
  activo: boolean;
  /** Only the last 3 digits are visible, e.g. `*******050`. */
  cedulaEnmascarada: string;
}

export interface UsuarioDetalle extends Usuario {
  /** Clinica role only: the clinic they manage. */
  clinica: { id: number; nombre: string } | null;
  /** Kept for compatibility; always empty after the refactor. */
  doctoresAsignados: Pick<Doctor, "id" | "nombres" | "apellidos">[];
}

/** Row of `servicio` as returned by `GET /admin/catalogo/servicios`. `precio` is a numeric(12,2) string in COP. */
export interface Servicio {
  id: string;           // UUID
  slug?: string;
  nombre: string;
  descripcion: string | null;
  precio: string;
  activo: boolean;
  imagenUrl?: string | null;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

/** Lightweight doctor option for the "nueva orden" form. */
export interface DoctorOpcion {
  id: string;       // bigint string
  nombres: string;
  apellidos: string;
  correo: string | null;
}

/** Lightweight patient option for the "nueva orden" form. */
export interface PacienteOpcion {
  id: string;       // bigint string
  nombre: string;
}

// ---------------------------------------------------------------------------
// Cuentas de cobro
// ---------------------------------------------------------------------------

export type EstadoCuentaCobro =
  | "borrador"
  | "emitida"
  | "pagada_parcial"
  | "pagada"
  | "anulada";

export interface CuentaCobroOrdenItem {
  cuentaCobroId: string;
  ordenId: string;
  valorSnapshot: string;
  orden: Orden;
}

export interface PagoItem {
  id: string;
  cuentaCobroId: string;
  monto: string;
  fechaPago: string;
  metodo: string;
  referencia: string | null;
  notas: string | null;
  comprobanteUrl: string | null;
  comprobanteNombre: string | null;
  anulado: boolean;
  creadoEn: string;
}

export interface EnvioItem {
  id: string;
  enviadoA: string;
  estado: string;
  error: string | null;
  creadoEn: string;
}

export interface CuentaCobro {
  id: string;
  numero: string;
  clinicaId: string;
  clinicaNombre: string;
  clinicaCorreo: string | null;
  estado: EstadoCuentaCobro;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  total: string;
  pdfUrl: string | null;
  pdfHash: string | null;
  observaciones: string | null;
  creadaEn: string;
  ordenes: CuentaCobroOrdenItem[];
  pagos: PagoItem[];
  envios: EnvioItem[];
}

export interface OrdenDisponible {
  id: string;
  doctorId: string;
  estado: { codigo: string; nombre: string };
  asignacion: {
    paciente: { id: string; nombre: string };
  } | null;
  valor: string;
  fechaCreacion: string;
  urgente: boolean;
}

// ---------------------------------------------------------------------------

export type NivelPermiso = "si" | "no" | "delegado" | "por_definir";

export interface PermisoRol {
  nivel: NivelPermiso;
  nota?: string;
}

export interface PermisoFila {
  id: string;
  capacidad: string;
  roles: Record<RolNombre, PermisoRol>;
}
