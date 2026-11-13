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

const DIA_PATRON = '(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)'
/** "para el jueves", "entrega el viernes", "lo necesito el lunes": un día de ENTREGA. */
const RE_ENTREGA_DIA = new RegExp(
  `\\b(?:para|entrega(?:r(?:lo|la)?)?|necesito\\w*\\s+(?:que\\s+est[eé]\\s+)?|listo|lista)\\s+(?:el\\s+|este\\s+)?${DIA_PATRON}\\b`,
  'i',
)
const RE_ENTREGA_RELATIVA = /\b(?:para|entrega(?:r(?:lo|la)?)?)\s+(?:pasado\s+ma[ñn]ana|ma[ñn]ana|hoy)\b/i
const RE_URGENTE = /\b(?:urgent\w*|urge|urgencia|cuanto\s+antes|lo\s+antes\s+posible)\b/i

export interface EntregaTexto {
  /** Día de entrega pedido, resuelto hacia ADELANTE desde hoy; null si no se pidió. */
  fecha: string | null
  urgente: boolean
  /** El texto sin el fragmento de entrega, para que "el jueves" no se confunda con el día de creación. */
  resto: string
}

/**
 * Entrega y urgencia dichas en la frase (S1/S4 de whatsapp-humano): "urgente
 * para el jueves" se resuelve hacia adelante (el jueves que viene; hoy si es
 * hoy), al contrario de resolverDiaReferencia, que identifica órdenes ya
 * hechas y mira hacia atrás.
 */
export function entregaDeTexto(texto: string, ahora: Date): EntregaTexto {
  let resto = texto
  let fecha: string | null = null
  const hoy = fechaLocal(ahora)
  const porDia = RE_ENTREGA_DIA.exec(resto)
  if (porDia?.[1]) {
    const i = NOMBRES_DIA.indexOf(normalizar(porDia[1]))
    if (i >= 0) {
      // "para el viernes" dicho un viernes es el de la otra semana; hoy se dice "para hoy".
      fecha = sumarDias(hoy, (i - diaSemana(hoy) + 7) % 7 || 7)
      resto = resto.replace(RE_ENTREGA_DIA, ' ')
    }
  } else {
    const relativa = RE_ENTREGA_RELATIVA.exec(resto)
    if (relativa) {
      const t = normalizar(relativa[0])
      fecha = t.includes('pasado') ? sumarDias(hoy, 2) : t.includes('manana') ? sumarDias(hoy, 1) : hoy
      resto = resto.replace(RE_ENTREGA_RELATIVA, ' ')
    }
  }
  const urgente = RE_URGENTE.test(resto)
  if (urgente) resto = resto.replace(RE_URGENTE, ' ')
  return { fecha, urgente, resto }
}

/** ¿La fecha ISO (con hora) cae en ese día del laboratorio? */
export function esDelDia(fecha: string | null | undefined, dia: string): boolean {
  if (!fecha) return false
  const instante = new Date(fecha)
  return !Number.isNaN(instante.getTime()) && fechaLocal(instante) === dia
}
