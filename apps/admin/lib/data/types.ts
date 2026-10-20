/**
 * Domain types mirroring `apps/api/docs/database-model.md`.
 * Monetary values are numeric STRINGS with 2 decimals, exactly like
 * `numeric(12,2)` columns serialized by the API. Dates are ISO 8601 strings.
 */

export const ESTADOS_ORDEN = ["recibida", "en_produccion", "terminada"] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

/** Reference to a doctor (`doctor` joined with `usuario`). */
export interface Doctor {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  clinicaId: number | null;
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
  direccion: string | null;
  doctores: Doctor[];
}

export const ROLES = ["administrador", "odontologo", "asistente"] as const;
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
  /** Doctors only: the clinic they belong to (`doctor.clinica_id`). */
  clinica: { id: number; nombre: string } | null;
  /** Assistants only: doctors linked through `asistente_doctor`. */
  doctoresAsignados: Pick<Doctor, "id" | "nombres" | "apellidos">[];
}

/** Row of `servicio`. `precio` is a numeric(12,2) string in COP. */
export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  activo: boolean;
}

/** Editable page of the public site (read from `apps/web`, no CMS tables exist). */
export interface PaginaWeb {
  ruta: string;
  nombre: string;
  titulo: string;
  descripcion: string;
}

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
