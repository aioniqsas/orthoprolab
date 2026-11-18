/**
 * Ritmo humano de respuesta: nadie contesta en 200 ms. La espera se calcula
 * sobre el largo de la respuesta (0,3 s por carácter) y se topa para no dejar
 * al otro lado 90 segundos mirando "escribiendo…", que es peor que contestar
 * rápido: WhatsApp deja de mostrar el indicador y la persona cree que el bot
 * se colgó.
 */
export const PAUSA_POR_CARACTER_MS = 300
export const PAUSA_MAXIMA_MS = 20_000
/** WhatsApp apaga el indicador de escritura si no se refresca. */
export const REFRESCO_ESCRITURA_MS = 5_000

export type Presencia = 'composing' | 'paused'

/** Cuánto esperar antes de enviar una respuesta de este largo. */
export function pausaAntesDeResponder(texto: string): number {
  return Math.min(texto.length * PAUSA_POR_CARACTER_MS, PAUSA_MAXIMA_MS)
}

/**
 * Espera mostrando "escribiendo", refrescando el indicador para que no expire,
 * y lo apaga al terminar. Un texto vacío no muestra nada: no hay nada que
 * escribir.
 */
export async function esperarEscribiendo(
  ms: number,
  enviarPresencia: (estado: Presencia) => Promise<void>,
  esperar: (ms: number) => Promise<void> = (espera) => new Promise((listo) => setTimeout(listo, espera)),
): Promise<void> {
  if (ms <= 0) return
  await enviarPresencia('composing')
  let restante = ms
  while (restante > 0) {
    const tramo = Math.min(REFRESCO_ESCRITURA_MS, restante)
    await esperar(tramo)
    restante -= tramo
    if (restante > 0) await enviarPresencia('composing')
  }
  await enviarPresencia('paused')
}

/** Texto que se va a "escribir": cuerpo del mensaje o pie del documento. */
export function textoDeRespuesta(contenido: { text?: string; caption?: string }): string {
  return contenido.text ?? contenido.caption ?? ''
}
