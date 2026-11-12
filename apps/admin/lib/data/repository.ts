import { fullName } from "./helpers";
import { coincideTexto } from "@/lib/busqueda";
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
import { SAMPLE_ORDENES } from "./sample";
import { listCatalogoServicios, getCatalogoServicio } from "../catalogo-api";
import { API_URL } from "../api";
import type {
  Clinica,
  ClinicaDetalle,
  CuentaCobro,
  CuentaCobroOrdenItem,
  Doctor,
  DoctorOpcion,
  EnvioItem,
  EstadoCuentaCobro,
  EstadoOrdenItem,
  Orden,
  OrdenDisponible,
  PacienteOpcion,
  PagoItem,
  RolNombre,
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
  id: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  clinicaId: string;
  activo: boolean;
}

interface RawPaciente {
  id: string;
  nombre: string;
}

interface RawDetalleOrden {
  id: string;
  servicio: string;
  cantidad: number;
  precioUnitario: string | null;
  dientes?: number[] | null;
  colorDiente?: string | null;
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
  // Opcionales: la lista y la cuenta de cobro no los cargan (ver API B2/B3).
  detalles?: RawDetalleOrden[];
  historial?: RawHistorialEstado[];
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapOrden(raw: RawOrden): Orden {
  return {
    id: Number(raw.id),
    doctor: {
      id: raw.asignacion.doctor.id,
      nombres: raw.asignacion.doctor.nombres,
      apellidos: raw.asignacion.doctor.apellidos,
      correo: raw.asignacion.doctor.correo,
      clinicaId: raw.asignacion.doctor.clinicaId,
      activo: raw.asignacion.doctor.activo,
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
    detalles: (raw.detalles ?? []).map((d) => ({
      id: Number(d.id),
      servicio: d.servicio,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      dientes: d.dientes ?? [],
      colorDiente: d.colorDiente ?? null,
      observaciones: d.observaciones,
    })),
    historial: (raw.historial ?? []).map((h) => ({
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

function consultaBusqueda(q?: string): string {
  return q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
}

export async function listOrdenes(q?: string): Promise<Orden[]> {
  // The search runs on the server; sample data mirrors it locally.
  if (SAMPLE_DATA) {
    return [...SAMPLE_ORDENES]
      .filter((o) => coincideTexto(q, [`#${o.id}`, fullName(o.doctor), o.paciente.nombre]))
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
  }
  try {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const res = await fetch(`${API_URL}/ordenes${qs}`, {
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

/** Returns all standalone doctor records (optionally filtered by clinicaId). */
export async function listDoctores(clinicaId?: string): Promise<Doctor[]> {
  try {
    const url = clinicaId
      ? `${API_URL}/doctores?clinicaId=${encodeURIComponent(clinicaId)}`
      : `${API_URL}/doctores`;
    const res = await fetch(url, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Doctor[];
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
// Raw API shapes — Clinics
// ---------------------------------------------------------------------------

interface RawClinicaListItem {
  id: string;
  nombre: string;
  correo: string | null;
  direccion: string | null;
  fechaCreacion: string;
  doctorCount: number;
}

interface RawClinicaDetalle extends RawClinicaListItem {
  doctores: {
    id: string;
    nombres: string;
    apellidos: string;
    correo: string | null;
    clinicaId: string;
    activo: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// Raw API shapes — Users
// ---------------------------------------------------------------------------

interface RawUsuarioItem {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  activo: boolean;
  fechaCreacion: string;
  rol: { id: number; nombre: string };
  clinica: { id: string; nombre: string } | null;
  cedulaEnmascarada?: string;
}

// ---------------------------------------------------------------------------
// Public API — Clinics
// ---------------------------------------------------------------------------

export async function listClinicas(q?: string): Promise<Clinica[]> {
  try {
    const res = await fetch(`${API_URL}/clinicas${consultaBusqueda(q)}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as RawClinicaListItem[];
    return raw.map((c) => ({
      id: Number(c.id),
      nombre: c.nombre,
      correo: c.correo,
      direccion: c.direccion,
      doctores: [],
      doctorCount: c.doctorCount,
    }));
  } catch {
    return [];
  }
}

export async function getClinica(id: number | string): Promise<ClinicaDetalle | null> {
  try {
    const res = await fetch(`${API_URL}/clinicas/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const raw = (await res.json()) as RawClinicaDetalle;
    return {
      id: Number(raw.id),
      nombre: raw.nombre,
      correo: raw.correo,
      direccion: raw.direccion,
      doctorCount: raw.doctorCount,
      doctores: raw.doctores.map((d) => ({
        id: d.id,
        nombres: d.nombres,
        apellidos: d.apellidos,
        correo: d.correo,
        clinicaId: d.clinicaId,
        activo: d.activo,
      })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API — Users
// ---------------------------------------------------------------------------

export async function listUsuarios(q?: string): Promise<Usuario[]> {
  try {
    const res = await fetch(`${API_URL}/usuarios${consultaBusqueda(q)}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as RawUsuarioItem[];
    return raw.map((u) => ({
      id: u.id,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo,
      rol: u.rol.nombre as RolNombre,
      activo: u.activo,
      cedulaEnmascarada: u.cedulaEnmascarada ?? "",
    }));
  } catch {
    return [];
  }
}

export async function getUsuario(id: string): Promise<UsuarioDetalle | null> {
  try {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const raw = (await res.json()) as RawUsuarioItem;
    return {
      id: raw.id,
      nombres: raw.nombres,
      apellidos: raw.apellidos,
      correo: raw.correo,
      rol: raw.rol.nombre as RolNombre,
      activo: raw.activo,
      cedulaEnmascarada: raw.cedulaEnmascarada ?? "",
      clinica: raw.clinica
        ? { id: Number(raw.clinica.id), nombre: raw.clinica.nombre }
        : null,
      doctoresAsignados: [],
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API — Catalog (delegates to catalogo-api.ts)
// ---------------------------------------------------------------------------

export async function listServicios(q?: string): Promise<Servicio[]> {
  return listCatalogoServicios(q);
}

export async function getServicio(id: string): Promise<Servicio | null> {
  return getCatalogoServicio(id);
}

// ---------------------------------------------------------------------------
// Raw API shapes — Cuentas de cobro
// ---------------------------------------------------------------------------

interface RawPago {
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

interface RawEnvio {
  id: string;
  enviadoA: string;
  estado: string;
  error: string | null;
  creadoEn: string;
}

interface RawCuentaCobroOrden {
  cuentaCobroId: string;
  ordenId: string;
  valorSnapshot: string;
  orden: RawOrden;
}

interface RawCuentaCobro {
  id: string;
  numero: string;
  clinica: {
    id: string;
    nombre: string;
    correo: string | null;
  };
  estado: string;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  total: string;
  pdfUrl: string | null;
  pdfHash: string | null;
  observaciones: string | null;
  creadaEn: string;
  ordenes: RawCuentaCobroOrden[];
  pagos: RawPago[];
  envios: RawEnvio[];
}

function mapPago(raw: RawPago): PagoItem {
  return {
    id: raw.id,
    cuentaCobroId: raw.cuentaCobroId,
    monto: raw.monto,
    fechaPago: raw.fechaPago,
    metodo: raw.metodo,
    referencia: raw.referencia,
    notas: raw.notas,
    comprobanteUrl: raw.comprobanteUrl,
    comprobanteNombre: raw.comprobanteNombre,
    anulado: raw.anulado,
    creadoEn: raw.creadoEn,
  };
}

function mapEnvio(raw: RawEnvio): EnvioItem {
  return {
    id: raw.id,
    enviadoA: raw.enviadoA,
    estado: raw.estado,
    error: raw.error,
    creadoEn: raw.creadoEn,
  };
}

function mapCuentaCobroOrden(raw: RawCuentaCobroOrden): CuentaCobroOrdenItem {
  return {
    cuentaCobroId: raw.cuentaCobroId,
    ordenId: raw.ordenId,
    valorSnapshot: raw.valorSnapshot,
    orden: mapOrden(raw.orden),
  };
}

function mapCuentaCobro(raw: RawCuentaCobro): CuentaCobro {
  return {
    id: raw.id,
    numero: raw.numero,
    clinicaId: raw.clinica.id,
    clinicaNombre: raw.clinica.nombre,
    clinicaCorreo: raw.clinica.correo,
    estado: raw.estado as EstadoCuentaCobro,
    fechaEmision: raw.fechaEmision,
    fechaVencimiento: raw.fechaVencimiento,
    total: raw.total,
    pdfUrl: raw.pdfUrl,
    pdfHash: raw.pdfHash,
    observaciones: raw.observaciones,
    creadaEn: raw.creadaEn,
    ordenes: (raw.ordenes ?? []).map(mapCuentaCobroOrden),
    pagos: (raw.pagos ?? []).map(mapPago),
    envios: (raw.envios ?? []).map(mapEnvio),
  };
}

// ---------------------------------------------------------------------------
// Public API — Cuentas de cobro
// ---------------------------------------------------------------------------

export async function listCuentasCobro(q?: string): Promise<CuentaCobro[]> {
  try {
    const res = await fetch(`${API_URL}/cuentas-cobro${consultaBusqueda(q)}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as RawCuentaCobro[];
    return raw.map(mapCuentaCobro);
  } catch {
    return [];
  }
}

export async function getCuentaCobro(id: string): Promise<CuentaCobro | null> {
  try {
    const res = await fetch(`${API_URL}/cuentas-cobro/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[getCuentaCobro] API ${res.status} for id=${id}`);
      return null;
    }
    const raw = (await res.json()) as RawCuentaCobro;
    return mapCuentaCobro(raw);
  } catch (err) {
    console.error(`[getCuentaCobro] mapper error for id=${id}:`, err);
    return null;
  }
}

export async function getOrdenesDisponibles(
  cuentaCobroId: string,
): Promise<OrdenDisponible[]> {
  try {
    const res = await fetch(
      `${API_URL}/cuentas-cobro/${cuentaCobroId}/ordenes-disponibles`,
      { headers: await authHeader(), cache: "no-store" },
    );
    if (!res.ok) return [];
    return (await res.json()) as OrdenDisponible[];
  } catch {
    return [];
  }
}
