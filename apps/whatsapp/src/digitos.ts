/**
 * Dígitos dentro del texto (S11/T12): pasos que esperan un número aceptan
 * "orden 1234", "#1234", "la 1234" o "N.º 1234". Devuelve el número solo si el
 * texto contiene una única secuencia de dígitos; dos o más ("26 27") no es
 * interpretable y se rechaza. Los pasos de texto libre (color, observaciones)
 * nunca lo usan.
 */
export function extraerNumero(texto: string): string | null {
  const grupos = texto.match(/\d+/g)
  return grupos && grupos.length === 1 ? grupos[0]! : null
}
