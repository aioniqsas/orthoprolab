import { fullName, normalizeText } from "./helpers";
import { ROLES } from "./types";
import type { RolNombre, Servicio, Usuario } from "./types";

const ROL_LABELS: Record<RolNombre, string> = {
  administrador: "Administrador",
  odontologo: "Odontólogo",
  asistente: "Asistente",
};

export function rolLabel(rol: RolNombre): string {
  return ROL_LABELS[rol];
}

/**
 * Masks a cedula keeping only the last 3 digits. Non-digits are dropped first,
 * and a value of 3 digits or fewer is masked entirely.
 */
export function maskCedula(cedula: string): string {
  const digits = cedula.replace(/\D/g, "");
  if (digits.length <= 3) return "*".repeat(digits.length);
  return "*".repeat(digits.length - 3) + digits.slice(-3);
}

export type ActivoFilter = boolean | undefined;

export interface UsuarioFilters {
  rol?: RolNombre;
  q?: string;
}

export function filterUsuarios(usuarios: Usuario[], filters: UsuarioFilters): Usuario[] {
  const q = normalizeText(filters.q ?? "");
  return usuarios.filter((u) => {
    if (filters.rol && u.rol !== filters.rol) return false;
    if (!q) return true;
    return normalizeText(fullName(u)).includes(q) || normalizeText(u.correo).includes(q);
  });
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseUsuarioFilters(params: RawParams): UsuarioFilters {
  const rol = first(params.rol);
  return {
    rol: (ROLES as readonly string[]).includes(rol) ? (rol as RolNombre) : undefined,
    q: first(params.q).trim(),
  };
}

export interface ServicioFilters {
  activo?: boolean;
  q?: string;
}

export function filterServicios(servicios: Servicio[], filters: ServicioFilters): Servicio[] {
  const q = normalizeText(filters.q ?? "");
  return servicios.filter((s) => {
    if (filters.activo !== undefined && s.activo !== filters.activo) return false;
    if (!q) return true;
    return (
      normalizeText(s.nombre).includes(q) || normalizeText(s.descripcion ?? "").includes(q)
    );
  });
}

export function parseServicioFilters(params: RawParams): ServicioFilters {
  const activo = first(params.activo);
  return {
    activo: activo === "1" ? true : activo === "0" ? false : undefined,
    q: first(params.q).trim(),
  };
}
