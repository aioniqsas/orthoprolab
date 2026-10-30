/** Permanent dentition, FDI two-digit numbering (11-48). */
export interface Diente {
  numero: number;
  color: string;
}

export const COLOR_MAX_LENGTH = 20;

/** Upper right 18-11, upper left 21-28, lower right 48-41, lower left 31-38. */
export const ARCO_SUPERIOR = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;
export const ARCO_INFERIOR = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

const VALIDOS = new Set<number>([...ARCO_SUPERIOR, ...ARCO_INFERIOR]);

export type ParseDientesResult =
  | { ok: true; dientes: Diente[] }
  | { ok: false; error: string };

/**
 * Parses the selection coming from the odontogram, either as the form field
 * (JSON string) or already parsed. Validation lives here (not only in the API
 * DTO) so each portal can point at the offending row.
 */
export function parseDientes(raw: unknown): ParseDientesResult {
  let parsed: unknown = raw;

  if (typeof raw === "string") {
    if (raw.trim() === "") {
      return { ok: false, error: "Selecciona al menos un diente." };
    }
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "La selección de dientes no es válida." };
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, error: "Selecciona al menos un diente." };
  }

  const dientes: Diente[] = [];
  const vistos = new Set<number>();
  for (const item of parsed) {
    const { numero, color } = (item ?? {}) as { numero?: unknown; color?: unknown };
    if (typeof numero !== "number" || !VALIDOS.has(numero)) {
      return { ok: false, error: "Hay un diente fuera de la numeración FDI." };
    }
    if (vistos.has(numero)) {
      return { ok: false, error: `El diente ${numero} está repetido.` };
    }
    const tono = typeof color === "string" ? color.trim() : "";
    if (!tono || tono.length > COLOR_MAX_LENGTH) {
      return {
        ok: false,
        error: `Indica el color del diente ${numero} (máx. ${COLOR_MAX_LENGTH} caracteres).`,
      };
    }
    vistos.add(numero);
    dientes.push({ numero, color: tono });
  }

  return { ok: true, dientes };
}
