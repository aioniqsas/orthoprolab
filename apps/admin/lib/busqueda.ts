/** Same rule as the API's common/busqueda: ignore case and accents, substring match. */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** True when `q` is empty or appears in any of the fields (used for sample data). */
export function coincideTexto(q: string | undefined, campos: ReadonlyArray<string | null | undefined>): boolean {
  const aguja = normalizarTexto(q ?? "");
  if (!aguja) return true;
  return campos.some((campo) => normalizarTexto(campo ?? "").includes(aguja));
}
