/**
 * Fechas del laboratorio (S7). La fecha de hoy, la zona horaria y las
 * referencias relativas ("el martes", "ayer") se calculan aquí, en código:
 * el modelo nunca las deduce ni las inventa.
 */

export const ZONA_LABORATORIO = 'America/Bogota'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Igual que la coincidencia de nombres: sin tildes, sin mayúsculas, sin espacios de más. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fecha local del laboratorio en formato YYYY-MM-DD. */
export function fechaLocal(ahora: Date): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_LABORATORIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora)
  const valor = (tipo: string): string => partes.find((p) => p.type === tipo)?.value ?? '00'
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

/** Suma (o resta) días a una fecha local sin pasar por husos intermedios. */
export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a!, m! - 1, d! + dias)).toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}

/** "martes 10 de junio de 2025" (o sin el día de la semana). */
export function fechaLarga(iso: string, conDia = true): string {
  const [a, m, d] = iso.split('-').map(Number)
  const texto = `${d} de ${MESES[m! - 1] ?? ''} de ${a}`
  return conDia ? `${DIAS[diaSemana(iso)]} ${texto}` : texto
}

/** "10 de junio" */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m! - 1] ?? ''}`
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

/**
 * Día local al que se refiere el texto, buscando siempre hacia atrás desde hoy
 * ("el martes" es el martes más reciente). null si no hay referencia temporal.
 */
export function resolverDiaReferencia(texto: string, ahora: Date): string | null {
  const t = normalizar(texto)
  if (t === '') return null
  const hoy = fechaLocal(ahora)
  if (/\b(anteayer|antes de ayer|antier)\b/.test(t)) return sumarDias(hoy, -2)
  if (/\bayer\b/.test(t)) return sumarDias(hoy, -1)
  if (/\b(hoy|esta manana|de esta manana|esta tarde)\b/.test(t)) return hoy
  for (let i = 0; i < NOMBRES_DIA.length; i++) {
    if (new RegExp(`\\b${NOMBRES_DIA[i]}\\b`).test(t)) {
      return sumarDias(hoy, -((diaSemana(hoy) - i + 7) % 7))
    }
  }
  return null
}

/** ¿La fecha ISO (con hora) cae en ese día del laboratorio? */
export function esDelDia(fecha: string | null | undefined, dia: string): boolean {
  if (!fecha) return false
  const instante = new Date(fecha)
  return !Number.isNaN(instante.getTime()) && fechaLocal(instante) === dia
}
