export const COLOR_MAX_LENGTH = 20;

/** Upper right 18-11, upper left 21-28, lower right 48-41, lower left 31-38. */
export const ARCO_SUPERIOR = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;
export const ARCO_INFERIOR = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

const VALIDOS = new Set<number>([...ARCO_SUPERIOR, ...ARCO_INFERIOR]);

/** True si `numero` es una pieza válida de la numeración FDI de dos dígitos. */
export function esDienteValido(numero: number): boolean {
  return VALIDOS.has(numero);
}

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

/** Nombre de la pieza según el segundo dígito FDI (1 = incisivo central … 8 = tercer molar). */
const NOMBRE_PIEZA: Record<number, string> = {
  1: "incisivo central",
  2: "incisivo lateral",
  3: "canino",
  4: "primer premolar",
  5: "segundo premolar",
  6: "primer molar",
  7: "segundo molar",
  8: "tercer molar",
};

/** Cuadrante según el primer dígito FDI. */
const CUADRANTE: Record<number, string> = {
  1: "superior derecho",
  2: "superior izquierdo",
  3: "inferior izquierdo",
  4: "inferior derecho",
};

/** Clase de pieza, para los resúmenes de varias selecciones. */
const CLASE_PIEZA: Record<string, { singular: string; plural: string }> = {
  incisivo: { singular: "incisivo", plural: "incisivos" },
  canino: { singular: "canino", plural: "caninos" },
  premolar: { singular: "premolar", plural: "premolares" },
  molar: { singular: "molar", plural: "molares" },
};

const claseDe = (tipo: number): string =>
  tipo <= 2 ? "incisivo" : tipo === 3 ? "canino" : tipo <= 5 ? "premolar" : "molar";

/** Nombre completo de una pieza: `14` → "primer premolar superior derecho". */
export function nombreDiente(numero: number): string {
  const pieza = NOMBRE_PIEZA[numero % 10];
  const cuadrante = CUADRANTE[Math.floor(numero / 10)];
  if (!pieza || !cuadrante) return `diente ${numero}`;
  return `${pieza} ${cuadrante}`;
}

/**
 * Resumen legible de una selección: "primer premolar superior derecho" para una
 * sola pieza y "2 premolares y 3 molares" para varias.
 */
export function resumenDientes(dientes: readonly number[]): string {
  const unicos = [...new Set(dientes)].sort((a, b) => a - b);
  if (unicos.length === 0) return "";
  if (unicos.length === 1) return nombreDiente(unicos[0]!);

  const conteo = new Map<string, number>();
  for (const numero of unicos) {
    const clase = claseDe(numero % 10);
    conteo.set(clase, (conteo.get(clase) ?? 0) + 1);
  }

  const orden = ["incisivo", "canino", "premolar", "molar"].filter((clase) => conteo.has(clase));
  const partes = orden.map((clase) => {
    const cantidad = conteo.get(clase)!;
    const nombre = CLASE_PIEZA[clase]!;
    return `${cantidad} ${cantidad === 1 ? nombre.singular : nombre.plural}`;
  });

  return partes.length <= 1
    ? partes.join("")
    : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}
