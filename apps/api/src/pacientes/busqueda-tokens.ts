import { normalizarBusqueda } from '../common/busqueda.js';

/** Words of a text, normalized: case and accents removed, punctuation split. */
export function palabrasNormalizadas(texto: string): string[] {
  return normalizarBusqueda(texto)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p.length > 0);
}

/** Every trigram of every word that has at least three letters. */
export function trigramas(texto: string): string[] {
  const set = new Set<string>();
  for (const palabra of palabrasNormalizadas(texto)) {
    for (let i = 0; i + 3 <= palabra.length; i++) {
      set.add(palabra.slice(i, i + 3));
    }
  }
  return [...set];
}

/** Digits only (cedula normalization for search and for the blind index). */
export function digitosDe(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Minimum letters in a name search, so the index always has something to match. */
export const MIN_LETRAS_BUSQUEDA = 3;

/** True when the term has enough letters to be searched by name. */
export function nombreBuscable(texto: string): boolean {
  return palabrasNormalizadas(texto).join('').length >= MIN_LETRAS_BUSQUEDA;
}
