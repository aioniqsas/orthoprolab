import { describe, expect, it } from 'bun:test'
import type { ApiClient } from '../src/api.js'
import { PuertaConfirmacion, CONFIRMACION_REQUERIDA } from '../src/confirmacion.js'
import { ConversationStore } from '../src/estado.js'
import { ClienteGroq, configuracionLlm, FALLO_MODELO, StoreLlm } from '../src/llm.js'
import { DatosBot, type ClientePg } from '../src/datos.js'
import { OrderFlows } from '../src/write-flows.js'
import { OrdenExistenteFlows, PASO_CAMBIO } from '../src/orden-existente.js'

const TEL = '+573001234567'
const CONFIG = { host: 'db', port: 5432, database: 'orthopro', user: 'whatsapp_bot', password: 'secreto' }
const CONFIG_LLM = { apiKey: 'gsk_prueba', modelo: 'openai/gpt-oss-20b', timeoutMs: 50, nombre: 'Aioniq' }

type FetchFalso = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function poolFalso(filas: Record<string, unknown>[] = []) {
  const cliente: ClientePg = { query: async () => ({ rows: filas }), release: () => {} }
  return { pool: { connect: async () => cliente } }
}

function respuestaHerramienta(nombre: string, argumentos: string, id = 'call_1'): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { tool_calls: [{ id, function: { name: nombre, arguments: argumentos } }] } }],
      usage: { prompt_tokens: 20, completion_tokens: 8 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

describe('T3/S5 — mensaje fijo ante fallo del modelo (sin menú ni flujos)', () => {
  it('sin GROQ_API_KEY no hay modelo configurado', () => {
    expect(configuracionLlm({})).toBeNull()
    expect(configuracionLlm({ WHATSAPP_LLM_ENABLED: 'true' })).toBeNull()
  })

  it('con WHATSAPP_LLM_ENABLED=false no hay modelo configurado', () => {
    expect(configuracionLlm({ GROQ_API_KEY: 'gsk', WHATSAPP_LLM_ENABLED: 'false' })).toBeNull()
  })

  it('FALLO_MODELO es un texto fijo que ofrece reintentar y no es menú numerado', () => {
    expect(FALLO_MODELO).toBe('Ahora mismo no puedo responder. Intenta de nuevo en un momento, por favor.')
    expect(FALLO_MODELO).not.toMatch(/\n[1-5]\./)
    expect(FALLO_MODELO.toLowerCase()).toContain('intenta')
  })

  it('timeout del modelo → FALLO_MODELO', async () => {
    const fetchLento: FetchFalso = () => {
      throw new Error('AbortError')
    }
    const { pool } = poolFalso()
    const cliente = new ClienteGroq(CONFIG_LLM, fetchLento as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool)
    const r = await cliente.manejar(TEL, 'hola', datos, '42', new StoreLlm())
    expect(r).toEqual({ texto: FALLO_MODELO })
  })

  it('error HTTP del modelo → FALLO_MODELO', async () => {
    const fetch500: FetchFalso = async () => new Response('no', { status: 500 })
    const { pool } = poolFalso()
    const cliente = new ClienteGroq(CONFIG_LLM, fetch500 as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool)
    const r = await cliente.manejar(TEL, 'hola', datos, '42', new StoreLlm())
    expect(r).toEqual({ texto: FALLO_MODELO })
  })

  it('respuesta malformada del modelo → FALLO_MODELO', async () => {
    const fetchMalo: FetchFalso = async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })
    const { pool } = poolFalso()
    const cliente = new ClienteGroq(CONFIG_LLM, fetchMalo as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool)
    const r = await cliente.manejar(TEL, 'hola', datos, '42', new StoreLlm())
    expect(r).toEqual({ texto: FALLO_MODELO })
  })

  it('modelo sin respuesta utilizable tras las rondas → FALLO_MODELO', async () => {
    let llamadas = 0
    const fetchFake: FetchFalso = async () => {
      llamadas++
      return respuestaHerramienta('estado_orden', '{"orden":"7"}', `call_${llamadas}`)
    }
    // La herramienta debe devolver datos para que el modelo reciba resultado y
    // siga pidiendo herramientas otra ronda; sin filas sería "no encontrado".
    const { pool } = poolFalso([{ id: '7', estado: 'Creada', fecha_creacion: '2026-01-01', detalles: [] }])
    const cliente = new ClienteGroq(CONFIG_LLM, fetchFake as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool)
    const r = await cliente.manejar(TEL, 'insiste', datos, '42', new StoreLlm())
    expect(llamadas).toBe(2)
    expect(r).toEqual({ texto: FALLO_MODELO })
  })
})

describe('T3/S2 — camino normal sin prechequeo (el mensaje va directo al modelo)', () => {
  it('manejar consulta al modelo aunque el mensaje antes coincidiera con un prechequeo por regex', async () => {
    let fetches = 0
    const fetchFake: FetchFalso = async () => {
      fetches++
      return respuestaHerramienta('nuevo_pedido', '{}')
    }
    const { pool } = poolFalso()
    const cliente = new ClienteGroq(CONFIG_LLM, fetchFake as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool)
    const r = await cliente.manejar(TEL, 'hazme un pedido', datos, '42', new StoreLlm())
    expect(fetches).toBeGreaterThanOrEqual(1)
    expect(r.ruta?.tipo).toBe('nuevo_pedido')
  })
})

describe('T3/S4 — puerta de confirmación explícita y verificable en código', () => {
  it('PuertaConfirmacion: sin propuesta previa no hay confirmación verificada', () => {
    const puerta = new PuertaConfirmacion()
    expect(puerta.confirmada(TEL, 'crear_orden')).toBeUndefined()
    expect(puerta.confirmada(TEL, 'editar_orden')).toBeUndefined()
  })

  it('PuertaConfirmacion: proponer deja pendiente y solo "sí" en turno posterior la confirma', () => {
    const puerta = new PuertaConfirmacion()
    puerta.proponer(TEL, 'crear_orden', 'Resumen', { a: 1 })
    expect(puerta.pendiente(TEL)?.confirmado).toBe(false)
    expect(puerta.confirmada(TEL, 'crear_orden')).toBeUndefined()
    // texto que no es confirmación no confirma
    expect(puerta.confirmar(TEL, 'quizá')).toBeUndefined()
    expect(puerta.confirmada(TEL, 'crear_orden')).toBeUndefined()
    // "sí" confirma el resumen propuesto en turno previo
    const c = puerta.confirmar(TEL, 'sí')
    expect(c?.confirmado).toBe(true)
    expect(puerta.confirmada(TEL, 'crear_orden')?.confirmado).toBe(true)
  })

  it('sin confirmación previa, la escritura de crear orden no se ejecuta y el bot pide confirmar', async () => {
    let creaciones = 0
    const api = {
      crearOrden: async () => {
        creaciones++
        return { id: '99', detalles: [] }
      },
    } as unknown as ApiClient
    const store = new ConversationStore()
    const puerta = new PuertaConfirmacion()
    // Estado de confirmación sin propuesta previa registrada (atajo inconsistente).
    store.set(TEL, 'orden-confirmar', {
      doctorId: '1', doctorNombre: 'Dra. Ana', pacienteId: '2', pacienteNombre: 'Luis',
      servicioNombre: 'Corona', cantidad: '1', dientes: '11', color: 'A2', idemKey: 'k1',
    })
    const flows = new OrderFlows(store, api, puerta)
    const r = await flows.handle(TEL, 'sí')
    expect(creaciones).toBe(0)
    expect(r.text.toLowerCase()).toContain('confirm')
  })

  it('con resumen propuesto y confirmación del usuario, la escritura de crear orden se ejecuta', async () => {
    let creaciones = 0
    const api = {
      crearOrden: async () => {
        creaciones++
        return { id: '99', detalles: [] }
      },
    } as unknown as ApiClient
    const store = new ConversationStore()
    const puerta = new PuertaConfirmacion()
    const campos = {
      doctorId: '1', doctorNombre: 'Dra. Ana', pacienteId: '2', pacienteNombre: 'Luis',
      servicioNombre: 'Corona', cantidad: '1', dientes: '11', color: 'A2', idemKey: 'k1',
    }
    store.set(TEL, 'orden-confirmar', campos)
    puerta.proponer(TEL, 'crear_orden', 'Resumen', campos)
    const flows = new OrderFlows(store, api, puerta)
    const r = await flows.handle(TEL, 'sí')
    expect(creaciones).toBe(1)
    expect(r.text).toContain('Orden 99 creada')
  })

  it('sin confirmación previa, la escritura de editar orden no se ejecuta y el bot pide confirmar', async () => {
    let actualizaciones = 0
    const orden = {
      id: '55',
      estado: { codigo: 'creada', nombre: 'Creada' },
      fechaCreacion: '2026-11-13T10:00:00.000Z',
      fechaEntrega: '2026-11-20',
      detalles: [{ id: 1, servicio: 'Corona', cantidad: 1, dientes: [11, 12], colorDiente: 'A2' }],
      asignacion: { doctor: { id: '1', nombres: 'Ana', apellidos: 'Gómez' }, paciente: { id: '2', nombre: 'Luis', apellido: 'P' } },
      clinica: { id: '1' },
      editable: true,
    }
    const api = {
      getOrdenes: async () => [orden],
      getOrden: async () => orden,
      actualizarOrden: async () => {
        actualizaciones++
        return orden
      },
    } as unknown as ApiClient
    const store = new ConversationStore()
    const puerta = new PuertaConfirmacion()
    // Cambio válido con borrador listo para escribir, pero sin propuesta/confirmación explícita previa.
    store.set(TEL, PASO_CAMBIO, { numero: '55', quitar: '11' })
    const flujo = new OrdenExistenteFlows(store, api, () => new Date('2026-11-13T12:00:00.000Z'), undefined as never, puerta)
    const r = await flujo.handle(TEL, 'sí')
    expect(actualizaciones).toBe(0)
    expect(r.text.toLowerCase()).toContain('confirm')
  })
})
