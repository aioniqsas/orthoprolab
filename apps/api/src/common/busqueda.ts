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
