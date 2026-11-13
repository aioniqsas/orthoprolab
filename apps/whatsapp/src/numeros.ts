/**
 * Números dichos con palabras. La gente escribe "la orden diecisiete", no
 * "la orden 17", y el bot lo tomaba como un nombre de paciente.
 */
const DECENAS: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
}

const ESPECIALES: Record<string, number> = {
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  cien: 100,
}

const UNIDADES: Record<string, number> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** ¿Esta palabra es un número dicho con letras? */
export function esPalabraNumerica(palabra: string): boolean {
  const limpia = sinTildes(palabra).trim()
  return (
    /^(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)(\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve))?$/.test(
      limpia,
    ) ||
    limpia in ESPECIALES ||
    limpia in UNIDADES
  )
}

/**
 * Primer número dicho con palabras en el texto. Los llamadores le pasan el
 * fragmento relevante ("diecisiete" después de "la orden"), porque "un" o
 * "dos" sueltos en una frase no son un número de orden.
 */
export function numeroEnPalabras(texto: string): number | null {
  const t = sinTildes(texto)
  const compuesta =
    /(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/.exec(t)
  if (compuesta?.[1] && compuesta[2]) return DECENAS[compuesta[1]]! + UNIDADES[compuesta[2]]!
  for (const palabra of t.split(/[^a-zñ]+/).filter((p) => p !== '')) {
    if (palabra in ESPECIALES) return ESPECIALES[palabra]!
    if (palabra in DECENAS) return DECENAS[palabra]!
    if (palabra in UNIDADES) return UNIDADES[palabra]!
  }
  return null
}
