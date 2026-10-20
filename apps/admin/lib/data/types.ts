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
