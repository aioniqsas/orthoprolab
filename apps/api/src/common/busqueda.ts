/**
 * Server-side text search (optimizacion: search moved from the browser).
 * Case and accents are ignored, like the tables did. Matching runs over the
 * plaintext the server already decrypted: the browser only receives the rows
 * that matched, never the encrypted values it would have needed to filter.
 */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** True when `q` is empty or appears in any of the fields. */
export function coincideBusqueda(
  q: string | undefined,
  campos: ReadonlyArray<string | null | undefined>,
): boolean {
  const aguja = normalizarBusqueda(q ?? '');
  if (!aguja) return true;
  return campos.some((campo) => normalizarBusqueda(campo ?? '').includes(aguja));
}

/** Escapes LIKE wildcards in the user's text. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * LIKE pattern for a search term, or null when there is nothing to search.
 * The term is normalized like the stored text (case and accents ignored).
 */
export function patronBusqueda(q: string | undefined): string | null {
  const termino = normalizarBusqueda(q ?? '');
  return termino ? `%${escaparLike(termino)}%` : null;
}

/**
 * SQL expression for a column without case or accents, for comparison with a
 * pattern from `patronBusqueda`. Needs no extension (translate, not unaccent).
 */
export function sinAcentosSql(columna: string): string {
  return `translate(lower(COALESCE(${columna}, '')), 'áéíóúüñ', 'aeiouun')`;
}
