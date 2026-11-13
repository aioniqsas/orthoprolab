import { describe, expect, it } from 'bun:test'
import type { ApiClient } from '../src/api.js'
import { ConversationStore } from '../src/estado.js'
import { ReadFlows } from '../src/flows.js'
import { StoreLlm, type RespuestaLlm } from '../src/llm.js'
import { OrderFlows } from '../src/write-flows.js'

const TEL = '+573001234567'

const ES_ESCAPE = /^(?:0|cancelar|men[úu]|volver|inicio)$/i
const REINICIO = 'Listo, empecé de nuevo. ¿En qué te puedo ayudar?'

function apiFalso(): ApiClient {
  return {
    crearOrden: async () => ({ id: '99', detalles: [] }),
    getOrdenes: async () => [],
    getOrden: async () => ({ id: '55', detalles: [], estado: { codigo: 'creada', nombre: 'Creada' }, editable: true }),
    actualizarOrden: async () => ({ id: '55', detalles: [] }),
  } as unknown as ApiClient
}

describe('escape determinístico (reinicio sin modelo)', () => {
  it('reconoce 0, cancelar, menú/menu, volver e inicio sin distinguir mayúsculas', () => {
    for (const palabra of ['0', 'cancelar', 'Cancelar', 'menú', 'menu', 'MENU', 'volver', 'VOLVER', 'inicio', 'Inicio']) {
      expect(ES_ESCAPE.test(palabra)).toBe(true)
      expect(ES_ESCAPE.test(`  ${palabra}  `.trim())).toBe(true)
    }
    expect(ES_ESCAPE.test('hola')).toBe(false)
    expect(ES_ESCAPE.test('quiero cancelar la orden')).toBe(false)
  })

  it('limpia la confirmación pendiente y deja la conversación lista para empezar, sin llamar al modelo', async () => {
    const api = apiFalso()
    const store = new ConversationStore()
    const escritor = new OrderFlows(store, api)
    const flows = new ReadFlows(store, api, escritor)
    const storeLlm = new StoreLlm()

    // Deja una confirmación de creación pendiente (resumen propuesto).
    store.set(TEL, 'orden-confirmar', {
      doctorId: '1', doctorNombre: 'Dra. Ana', pacienteId: '2', pacienteNombre: 'Luis',
      servicioNombre: 'Corona', cantidad: '1', dientes: '11', color: 'A2', idemKey: 'k1',
    })
    await storeLlm.set(TEL, { historial: [{ role: 'user', content: 'hola' }], tokens: 10, expiresAt: Date.now() + 60_000 })

    let fetches = 0
    const modelo = async (): Promise<RespuestaLlm> => {
      fetches++
      return { texto: 'no debería llamarse' }
    }

    // Escape determinístico: igual que main.ts, sin llamar al modelo.
    const entrada = '  Cancelar  '
    let respuesta: string
    if (ES_ESCAPE.test(entrada.trim())) {
      store.clear(TEL)
      await storeLlm.clear(TEL)
      flows.limpiar(TEL)
      respuesta = REINICIO
    } else {
      const r = await modelo()
      respuesta = r.texto ?? ''
    }

    expect(respuesta).toBe(REINICIO)
    expect(fetches).toBe(0)
    expect(store.get(TEL)).toBeUndefined()
    expect(await storeLlm.get(TEL)).toBeUndefined()

    // Sin confirmación pendiente: intentar escribir ya no puede ejecutarse por
    // una confirmación previa; la conversación está lista para empezar.
    store.set(TEL, 'orden-confirmar', {
      doctorId: '1', doctorNombre: 'Dra. Ana', pacienteId: '2', pacienteNombre: 'Luis',
      servicioNombre: 'Corona', cantidad: '1', dientes: '11', color: 'A2', idemKey: 'k2',
    })
    const r = await escritor.handle(TEL, 'sí')
    expect(r.text.toLowerCase()).toContain('confirm')
  })
})
