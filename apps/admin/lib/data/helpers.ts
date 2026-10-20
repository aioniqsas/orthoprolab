import { ESTADOS_ORDEN } from "./types";
import type { Clinica, DetalleOrden, EstadoOrden, Orden } from "./types";

const ESTADO_LABELS: Record<EstadoOrden, string> = {
  recibida: "Recibida",
  en_produccion: "En producción",
  terminada: "Terminada",
};

export function estadoLabel(estado: EstadoOrden): string {
  return ESTADO_LABELS[estado];
}

/** Parses a `numeric(12,2)` string into integer cents (no float drift). */
function toCents(value: string): number {
  const [whole = "0", frac = ""] = value.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

function fromCents(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const frac = String(cents % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

/** Line subtotal = cantidad x precio_unitario, as a 2-decimal string. */
export function lineSubtotal(cantidad: number, precioUnitario: string): string {
  return fromCents(cantidad * toCents(precioUnitario));
}

/** Order total = sum of the line subtotals, as a 2-decimal string. */
export function orderTotal(
  detalles: Pick<DetalleOrden, "cantidad" | "precioUnitario">[],
): string {
  return fromCents(
    detalles.reduce((sum, d) => sum + d.cantidad * toCents(d.precioUnitario), 0),
  );
}

const copFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(value: string | number): string {
  return copFormat.format(Number(value));
}

const dateFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

export function formatDate(iso: string | null): string {
  return iso ? dateFormat.format(new Date(iso)) : "Sin fecha";
}

const dateTimeFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Lowercase and strip accents so searches ignore case and diacritics. */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function fullName(p: { nombres: string; apellidos: string }): string {
  return `${p.nombres} ${p.apellidos}`;
}

export interface OrdenFilters {
  estado?: EstadoOrden;
  urgente?: boolean;
  q?: string;
}

export function filterOrdenes(ordenes: Orden[], filters: OrdenFilters): Orden[] {
  const q = normalizeText((filters.q ?? "").replace(/^#/, ""));
  return ordenes.filter((o) => {
    if (filters.estado && o.estado !== filters.estado) return false;
    if (filters.urgente && !o.urgente) return false;
    if (!q) return true;
    return (
      String(o.id) === q ||
      normalizeText(fullName(o.doctor)).includes(q) ||
      normalizeText(o.paciente.nombre).includes(q)
    );
  });
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Validates URL search params into typed filters; invalid values are ignored. */
export function parseOrdenFilters(params: RawParams): OrdenFilters {
  const estado = first(params.estado);
  return {
    estado: (ESTADOS_ORDEN as readonly string[]).includes(estado)
      ? (estado as EstadoOrden)
      : undefined,
    urgente: first(params.urgente) === "1",
    q: first(params.q).trim(),
  };
}

export function parseQuery(params: RawParams): string {
  return first(params.q).trim();
}

export function filterClinicas(clinicas: Clinica[], query: string): Clinica[] {
  const q = normalizeText(query);
  if (!q) return clinicas;
  return clinicas.filter(
    (c) =>
      normalizeText(c.nombre).includes(q) ||
      normalizeText(c.direccion ?? "").includes(q) ||
      c.doctores.some((d) => normalizeText(fullName(d)).includes(q)),
  );
}
