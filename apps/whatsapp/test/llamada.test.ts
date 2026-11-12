import { describe, expect, it } from 'bun:test'
import { ApiError, type ApiClient } from '../src/api.js'
import { ReadFlows } from '../src/flows.js'
import { ConversationStore } from '../src/state.js'
import { MENSAJE_LIMITE_LLAMADA, RateLimiter } from '../src/rate-limit.js'

const TELEFONO = '+573001234567'

function falsoApi(respuestas: Partial<ApiClient>): ApiClient {
  return respuestas as unknown as ApiClient
}

function flujos(api: ApiClient): ReadFlows {
  return new ReadFlows(new ConversationStore(), api, undefined, new RateLimiter())
}

describe('opción 5: solicitud de llamada (T7, S11)', () => {
  it('éxito: llama al endpoint una sola vez y responde que el laboratorio llamará', async () => {
    let llamadas = 0
    const api = falsoApi({
      solicitarLlamada: async () => {
        llamadas++
      },
      registrarIntencion: async () => {},
    })
    const r = await flujos(api).handle(TELEFONO, '5')
    expect(llamadas).toBe(1)
    expect(r.kind).toBe('text')
    expect(r.text).toContain('te llamaremos')
  })

  it('fallo: no promete la llamada; ofrece la vía directa', async () => {
    const api = falsoApi({
      solicitarLlamada: async () => {
        throw new ApiError(503, 'caído')
      },
      registrarIntencion: async () => {},
    })
    const r = await flujos(api).handle(TELEFONO, '5')
    expect(r.kind).toBe('text')
    expect(r.text).not.toContain('te llamaremos')
    expect(r.text).toContain('laboratorio')
  })

  it('límite diario: tras el tope responde el aviso y no llama al endpoint', async () => {
    let llamadas = 0
    const api = falsoApi({
      solicitarLlamada: async () => {
        llamadas++
      },
      registrarIntencion: async () => {},
    })
    const flows = flujos(api)
    for (let i = 0; i < 10; i++) await flows.handle(TELEFONO, '5')
    const r = await flows.handle(TELEFONO, '5')
    expect(r.text).toBe(MENSAJE_LIMITE_LLAMADA)
    expect(llamadas).toBeLessThan(10)
  })

  it('auditoría: registra intención y paso, sin el texto del mensaje ni nombres', async () => {
    const cuerpos: Array<Record<string, unknown>> = []
    const api = falsoApi({
      solicitarLlamada: async () => {},
      registrarIntencion: async (telefono: string, intencion: string, paso: string) => {
        cuerpos.push({ telefono, intencion, paso })
      },
    })
    const flows = flujos(api)
    await flows.handle(TELEFONO, '5')
    expect(cuerpos).toHaveLength(1)
    const claves = Object.keys(cuerpos[0]!)
    expect(claves.sort()).toEqual(['intencion', 'paso', 'telefono'].sort())
    expect(cuerpos[0]!.intencion).toBe('llamada')
    expect(JSON.stringify(cuerpos[0])).not.toMatch(/texto|body|nombre|mensaje/)
  })
})
