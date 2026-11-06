import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/** Zona del negocio: toda decisión de "qué día es" se toma aquí. */
export const ZONA_NEGOCIO = "America/Bogota";

const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_NEGOCIO });

function aFecha(valor: Date | string): Date | null {
  const fecha = typeof valor === "string" ? new Date(valor) : valor;
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Día calendario (YYYY-MM-DD) de un instante, en la zona del negocio.
 * Explícito: no depende del `TZ` del proceso.
 */
export function diaNegocio(instante: Date | string): string {
  const fecha = aFecha(instante);
  if (!fecha) throw new RangeError(`Fecha inválida: ${String(instante)}`);
  return DIA.format(fecha);
}

/** Hoy en la zona del negocio, como día ISO. */
export function hoyNegocio(): string {
  return DIA.format(new Date());
}

/**
 * Fecha larga ("6 de noviembre de 2026") del día del negocio. Se formatea ese
 * día a mediodía UTC, así el resultado no cambia con el huso del proceso.
 */
export function formatearFecha(
  valor: Date | string | null | undefined,
  vacio = "Sin fecha",
): string {
  if (!valor) return vacio;
  const fecha = aFecha(valor);
  if (!fecha) return vacio;
  const dia = DIA.format(fecha);
  return format(parseISO(`${dia}T12:00:00.000Z`), "d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
}

/** Fecha y hora en la zona del negocio ("6 nov 2026, 12:19"). */
export function formatearFechaHora(
  valor: Date | string | null | undefined,
  vacio = "—",
): string {
  if (!valor) return vacio;
  const fecha = aFecha(valor);
  if (!fecha) return vacio;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: ZONA_NEGOCIO,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}
