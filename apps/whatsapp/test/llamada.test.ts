import { describe, expect, it } from 'bun:test'
import { ApiError, type ApiClient } from '../src/api.js'
import { ReadFlows } from '../src/flows.js'
import { ConversationStore } from '../src/estado.js'
import { MENSAJE_LIMITE_LLAMADA, RateLimiter } from '../src/rate-limit.js'

const TELEFONO = '+573001234567'

function falsoApi(respuestas: Partial<ApiClient>): ApiClient {
  return respuestas as unknown as ApiClient
}

describe('solicitud de llamada (ejecutor, T7)', () => {
  it('pedir_llamada pregunta antes de llamar y no toca el endpoint', async () => {
    let llamadas = 0
    const api = falsoApi({
      solicitarLlamada: async () => {
        llamadas++
      },
      registrarIntencion: async () => {},
    })
    const flows = new ReadFlows(new ConversationStore(), api, undefined, new RateLimiter())
    const r = await flows.atenderRuta(TELEFONO, { tipo: 'pedir_llamada' })
    expect(llamadas).toBe(0)
    expect(r.kind).toBe('text')
    expect(r.text).toContain('¿Quieres que el laboratorio te llame?')
  })

  it('registra la intención de llamada al enrutar', async () => {
    const cuerpos: Array<Record<string, unknown>> = []
    const api = falsoApi({
      solicitarLlamada: async () => {},
      registrarIntencion: async (telefono: string, intencion: string, paso: string) => {
        cuerpos.push({ telefono, intencion, paso })
      },
    })
    const flows = new ReadFlows(new ConversationStore(), api, undefined, new RateLimiter())
    await flows.atenderRuta(TELEFONO, { tipo: 'pedir_llamada' })
    expect(cuerpos).toHaveLength(1)
    const claves = Object.keys(cuerpos[0]!)
    expect(claves.sort()).toEqual(['intencion', 'paso', 'telefono'].sort())
    expect(cuerpos[0]!.intencion).toBe('llamada')
    expect(JSON.stringify(cuerpos[0])).not.toMatch(/texto|body|nombre|mensaje/)
  })
})
