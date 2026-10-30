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
  | { ok: true; dientes: number[] }
  | { ok: false; error: string };

/**
 * Parses the tooth selection of one work line, either as the form field (JSON
 * string) or already parsed. Validation lives here (not only in the API DTO) so
 * each portal can point at the offending row.
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

  const dientes: number[] = [];
  const vistos = new Set<number>();
  for (const numero of parsed) {
    // A tooth is just its FDI number; the shade belongs to the whole line.
    if (typeof numero !== "number" || !VALIDOS.has(numero)) {
      return { ok: false, error: "Hay un diente fuera de la numeración FDI." };
    }
    if (vistos.has(numero)) {
      return { ok: false, error: `El diente ${numero} está repetido.` };
    }
    vistos.add(numero);
    dientes.push(numero);
  }

  return { ok: true, dientes };
}

export type ParseColorResult = { ok: true; color: string } | { ok: false; error: string };

/** The shade belongs to the work line: every tooth on it shares it. */
export function parseColor(raw: unknown): ParseColorResult {
  const color = typeof raw === "string" ? raw.trim() : "";
  if (!color) return { ok: false, error: "Indica el color del trabajo." };
  if (color.length > COLOR_MAX_LENGTH) {
    return {
      ok: false,
      error: `El color no puede superar ${COLOR_MAX_LENGTH} caracteres.`,
    };
  }
  return { ok: true, color };
}
