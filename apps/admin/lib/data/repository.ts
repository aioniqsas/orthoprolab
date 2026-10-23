/**
 * Data access for the admin portal.
 *
 * Orders, stats, and estados are fetched from the real API.
 * Clinics, users, and the service catalog still use sample data or their
 * own dedicated API modules (catalogo-api.ts).
 *
 * Server-only: this module calls `cookies()` and must not be imported
 * inside client components.
 */
import "server-only";
import { cookies } from "next/headers";
import { SAMPLE_CLINICAS, SAMPLE_ORDENES, SAMPLE_USUARIOS } from "./sample";
import { listCatalogoServicios, getCatalogoServicio } from "../catalogo-api";
import { API_URL } from "../api";
import type {
  Clinica,
  DoctorOpcion,
  EstadoOrdenItem,
  Orden,
  PacienteOpcion,
  Servicio,
  Usuario,
  UsuarioDetalle,
} from "./types";
import type { EstadoOrden } from "./types";

/** When true, screens show the "Datos de ejemplo" notice. */
export const SAMPLE_DATA = false;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function authHeader(): Promise<HeadersInit> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? { Cookie: `auth_token=${token}` } : {};
}

// ---------------------------------------------------------------------------
// Raw API shapes (only the fields the mapping logic reads)
// ---------------------------------------------------------------------------

interface RawEstado {
  id: string;
  codigo: string;
  nombre: string;
}

interface RawDoctor {
  usuarioId: string;
  usuario: { id: string; nombres: string; apellidos: string; correo: string };
  clinicaId: string | null;
}

interface RawPaciente {
  id: string;
  nombre: string;
}

interface RawDetalleOrden {
  id: string;
  servicio: { id: string; nombre: string; precio: string };
  cantidad: number;
  precioUnitario: string;
  observaciones: string | null;
}

interface RawHistorialEstado {
  id: string;
  estadoAnterior: { codigo: string } | null;
  estadoNuevo: { codigo: string };
  usuario: { nombres: string; apellidos: string };
  fechaCambio: string;
  observaciones: string | null;
}

interface RawOrden {
  id: string;
  estado: RawEstado;
  asignacion: {
    doctor: RawDoctor;
    paciente: RawPaciente;
  };
  valor: string;
  urgente: boolean;
  fechaCreacion: string;
  fechaEntrega: string | null;
  detalles: RawDetalleOrden[];
  historial: RawHistorialEstado[];
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapOrden(raw: RawOrden): Orden {
  return {
    id: Number(raw.id),
    doctor: {
      id: raw.asignacion.doctor.usuarioId,
      nombres: raw.asignacion.doctor.usuario.nombres,
      apellidos: raw.asignacion.doctor.usuario.apellidos,
      correo: raw.asignacion.doctor.usuario.correo,
      clinicaId:
        raw.asignacion.doctor.clinicaId != null
          ? Number(raw.asignacion.doctor.clinicaId)
          : null,
    },
    paciente: {
      id: Number(raw.asignacion.paciente.id),
      nombre: raw.asignacion.paciente.nombre,
    },
    estado: raw.estado.codigo as EstadoOrden,
    estadoDbId: raw.estado.id,
    valor: raw.valor,
    urgente: raw.urgente,
    fechaCreacion: raw.fechaCreacion,
    fechaEntrega: raw.fechaEntrega,
    detalles: raw.detalles.map((d) => ({
      id: Number(d.id),
      servicio: d.servicio.nombre,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      observaciones: d.observaciones,
    })),
    historial: raw.historial.map((h) => ({
      id: Number(h.id),
      estadoAnterior: (h.estadoAnterior?.codigo ?? null) as EstadoOrden | null,
      estadoNuevo: h.estadoNuevo.codigo as EstadoOrden,
      usuario: `${h.usuario.nombres} ${h.usuario.apellidos}`,
      fechaCambio: h.fechaCambio,
      observaciones: h.observaciones,
    })),
  };
}

// ---------------------------------------------------------------------------
// Public API — Orders
// ---------------------------------------------------------------------------

export async function listOrdenes(): Promise<Orden[]> {
  if (SAMPLE_DATA) {
    return [...SAMPLE_ORDENES].sort((a, b) =>
      b.fechaCreacion.localeCompare(a.fechaCreacion),
    );
  }
  try {
    const res = await fetch(`${API_URL}/ordenes`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as RawOrden[];
    return raw.map(mapOrden);
  } catch {
    return [];
  }
}

export async function getOrden(id: number): Promise<Orden | null> {
  if (SAMPLE_DATA) {
    return SAMPLE_ORDENES.find((o) => o.id === id) ?? null;
  }
  try {
    const res = await fetch(`${API_URL}/ordenes/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawOrden;
    return mapOrden(raw);
  } catch {
    return null;
  }
}

/** Returns a map of `{ estadoCodigo: count }` for every state with orders. */
export async function getOrdenesStats(): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${API_URL}/ordenes/stats`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Returns all `estado_orden` rows ordered by position. */
export async function getEstadosOrden(): Promise<EstadoOrdenItem[]> {
  try {
    const res = await fetch(`${API_URL}/ordenes/estados`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as EstadoOrdenItem[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API — Nueva orden helpers
// ---------------------------------------------------------------------------

export async function listDoctoresOrden(): Promise<DoctorOpcion[]> {
  try {
    const res = await fetch(`${API_URL}/ordenes/doctores`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as DoctorOpcion[];
  } catch {
    return [];
  }
}

export async function listPacientesOrden(
  doctorId: string,
): Promise<PacienteOpcion[]> {
  try {
    const res = await fetch(
      `${API_URL}/ordenes/doctores/${doctorId}/pacientes`,
      { headers: await authHeader(), cache: "no-store" },
    );
    if (!res.ok) return [];
    return (await res.json()) as PacienteOpcion[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API — Clinics (still sample data)
// ---------------------------------------------------------------------------

export async function listClinicas(): Promise<Clinica[]> {
  return SAMPLE_CLINICAS;
}

export async function getClinica(id: number): Promise<Clinica | null> {
  return SAMPLE_CLINICAS.find((c) => c.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Public API — Users (still sample data)
// ---------------------------------------------------------------------------

/** List rows never expose detail-only fields. */
export async function listUsuarios(): Promise<Usuario[]> {
  return SAMPLE_USUARIOS.map((u) => ({
    id: u.id,
    nombres: u.nombres,
    apellidos: u.apellidos,
    correo: u.correo,
    rol: u.rol,
    activo: u.activo,
    cedulaEnmascarada: u.cedulaEnmascarada,
  }));
}

export async function getUsuario(id: string): Promise<UsuarioDetalle | null> {
  return SAMPLE_USUARIOS.find((u) => u.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Public API — Catalog (delegates to catalogo-api.ts)
// ---------------------------------------------------------------------------

export async function listServicios(): Promise<Servicio[]> {
  return listCatalogoServicios();
}

export async function getServicio(id: string): Promise<Servicio | null> {
  return getCatalogoServicio(id);
}
