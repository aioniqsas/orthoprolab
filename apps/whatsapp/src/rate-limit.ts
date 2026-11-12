/**
 * Límite por número (T7): un puñado de interacciones por minuto y un tope
 * diario de solicitudes de llamada, en memoria con el patrón del
 * ConversationStore. La decisión vive en `ventanaPermite`, pura con el reloj
 * inyectado, para que sea trivial de probar. Un límite nunca entra antes de
 * `shouldIgnoreSender`: solo se aplica a chats 1:1 ya aceptados.
 */

export const MAX_INTERACCIONES_POR_MINUTO = 20
export const MAX_LLAMADAS_POR_DIA = 3

export const MENSAJE_LIMITE =
  'Estás enviando muchos mensajes. Espera un momento y vuelve a intentarlo.'
export const MENSAJE_LIMITE_LLAMADA =
  'Ya registramos varias solicitudes de llamada hoy desde tu número. El laboratorio las está atendiendo; si es urgente, contáctalos por el portal o por teléfono.'

export type Ventana = { contador: number; inicio: number }

/** Decisión pura sobre una ventana deslizante por tope (no promedio). */
export function ventanaPermite(
  v: Ventana | undefined,
  now: number,
  ventanaMs: number,
  max: number,
): { permitido: boolean; ventana: Ventana } {
  if (!v || now - v.inicio >= ventanaMs) {
    return { permitido: true, ventana: { contador: 1, inicio: now } }
  }
  if (v.contador >= max) return { permitido: false, ventana: v }
  return { permitido: true, ventana: { ...v, contador: v.contador + 1 } }
}

const MAX_ENTRADAS = 5000

export class RateLimiter {
  private readonly interacciones = new Map<string, Ventana>()
  private readonly llamadas = new Map<string, Ventana>()

  interaccion(senderId: string, now: number): boolean {
    return this.paso(this.interacciones, senderId, now, 60_000, MAX_INTERACCIONES_POR_MINUTO)
  }

  llamada(senderId: string, now: number): boolean {
    return this.paso(this.llamadas, senderId, now, 24 * 60 * 60_000, MAX_LLAMADAS_POR_DIA)
  }

  private paso(
    mapa: Map<string, Ventana>,
    senderId: string,
    now: number,
    ventanaMs: number,
    max: number,
  ): boolean {
    // Evict expired entries first, then the oldest if the cap is still reached.
    for (const [id, v] of mapa) if (now - v.inicio >= ventanaMs) mapa.delete(id)
    while (mapa.size >= MAX_ENTRADAS) {
      const oldest = mapa.keys().next().value
      if (oldest === undefined) break
      mapa.delete(oldest)
    }
    const out = ventanaPermite(mapa.get(senderId), now, ventanaMs, max)
    if (out.permitido) mapa.set(senderId, out.ventana)
    return out.permitido
  }
}
