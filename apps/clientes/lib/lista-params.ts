/** One page of a list endpoint plus the total rows the API counted. */
export interface ListaPagina<T> {
  data: T[];
  total: number;
}

/** Filters and sorting the list endpoints understand (already validated). */
export interface ListaOpciones {
  grupo?: string;
  urgente?: boolean;
  activo?: boolean;
  sort?: string;
  order?: "asc" | "desc";
}

/** Page size of every portal listing; the user can change it in the table. */
export const LISTA_TAMANO = 10;

/** Page size options offered by the tables, smallest first. */
export const LISTA_TAMANOS = [10, 25, 50] as const;

/** 1-based page of a list URL; anything missing or invalid means page 1. */
export function listaPagina(valor?: string | number): number {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 ? numero : 1;
}

/** Page size of a list URL; only the offered sizes are accepted. */
export function listaTamano(valor?: string | number): number {
  const numero = Number(valor);
  return (LISTA_TAMANOS as readonly number[]).includes(numero)
    ? numero
    : LISTA_TAMANO;
}

/** `asc`/`desc` from the URL; anything else means the endpoint default. */
export function listaOrden(valor?: string): "asc" | "desc" | undefined {
  return valor === "asc" || valor === "desc" ? valor : undefined;
}

/** One whitelisted option from the URL (`grupo`, `sort`); anything else is dropped. */
export function listaOpcion(
  valor: string | undefined,
  permitidos: readonly string[],
): string | undefined {
  return valor && permitidos.includes(valor) ? valor : undefined;
}

/** `true`/`false` from the URL; anything else means no filter. */
export function listaBooleano(valor?: string): boolean | undefined {
  if (valor === "true") return true;
  if (valor === "false") return false;
  return undefined;
}

/**
 * Next sort state when a column header is clicked: asc → desc → no sort. A
 * different column starts at `asc` so the first click shows the natural order.
 */
export function listaSiguienteOrden(
  actual: { sort?: string; order?: "asc" | "desc" },
  key: string,
): { sort?: string; order?: "asc" | "desc" } {
  if (actual.sort !== key) return { sort: key, order: "asc" };
  if (actual.order !== "desc") return { sort: key, order: "desc" };
  return { sort: undefined, order: undefined };
}

/**
 * Query string of a list URL: the submitted search term, the page window, the
 * sort and every filter, leaving the defaults out. Only a page change keeps the
 * current page; anything else goes back to page 1 so no page is skipped.
 */
export function listaQuery(
  actual: Record<string, string | undefined>,
  patch: Record<string, string | number | undefined> = {},
): string {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(actual)) {
    if (value) next[key] = value;
  }
  const soloPagina = Object.keys(patch).length === 1 && "page" in patch;
  for (const [key, value] of Object.entries(patch)) {
    // The search term is trimmed: blank means "no search", not a space query.
    const normalized =
      key === "q" && typeof value === "string" ? value.trim() : value;
    if (normalized === undefined || normalized === "") delete next[key];
    else next[key] = String(normalized);
  }
  if (!soloPagina) delete next.page;
  if (next.page === "1") delete next.page;
  if (next.size === String(LISTA_TAMANO)) delete next.size;
  // Stable order (q, page, size, sort, order, filters) so the URL reads well.
  const canonical = ["q", "page", "size", "sort", "order"];
  const keys = [
    ...canonical.filter((key) => key in next),
    ...Object.keys(next).filter((key) => !canonical.includes(key)),
  ];
  return new URLSearchParams(keys.map((key) => [key, next[key]])).toString();
}
