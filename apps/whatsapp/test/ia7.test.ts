import { describe, expect, it } from 'bun:test'
import type { ApiClient, DoctorApi, ServicioApi } from '../src/api.js'
import { PREGUNTA_AYUDA, PREGUNTA_CUENTA, PREGUNTA_PEDIDO } from '../src/flows.js'
import { SALUDO, PREGUNTA_ACLARAR, buildMenu } from '../src/menu.js'
import { ConversationStore } from '../src/state.js'
import { ReadFlows, type Respuesta } from '../src/flows.js'
import { OrderFlows } from '../src/write-flows.js'
import { ClienteGroq, type Ruta, StoreLlm } from '../src/llm.js'
import { DatosBot, type ClientePg } from '../src/datos.js'

const TEL = '+573001234567'
const DOCTORES: DoctorApi[] = [{ id: 'doc-1', nombres: 'Ana', apellidos: 'Gómez' }]
const SERVICIOS: ServicioApi[] = [{ id: 's1', nombre: 'Corona zirconio' }]

interface ApiFalso extends ApiClient {
  crearOrdenLlamadas: unknown[]
  llamadasLlamada: number
}

function apiFalso(): ApiFalso {
  const api: ApiFalso = {
    crearOrdenLlamadas: [],
    llamadasLlamada: 0,
    getDoctores: async () => DOCTORES,
    getPacientes: async () => [{ id: '7', nombre: 'Luis Pérez', cedula: '1030' }],
    getServicios: async () => SERVICIOS,
    getOrdenes: async () => [],
    getOrden: async (_t: string, id: string) => ({ id, estado: { nombre: 'Producción' }, fechaEntrega: null, detalles: [] }),
    getCuentaCobro: async () => ({ numero: 'CC-1', pdfUrl: null }),
    crearOrden: async (_t: string, _p: unknown, _k?: string) => {
      api.crearOrdenLlamadas.push(_p)
      return { id: '1234', estado: { nombre: 'Creada' }, fechaEntrega: null, detalles: [] }
    },
    solicitarLlamada: async () => {
      api.llamadasLlamada += 1
    },
    registrarIntencion: async () => {},
  } as unknown as ApiFalso
  return api
}

function par(api: ApiClient): { flows: ReadFlows; esc: OrderFlows; store: ConversationStore } {
  const store = new ConversationStore()
  const esc = new OrderFlows(store, api)
  const flows = new ReadFlows(store, api, esc)
  return { flows, esc, store }
}

function texto(r: Respuesta): string {
  return (r as { text: string }).text
}

const CONFIG = { host: 'db', port: 5432, database: 'orthopro', user: 'whatsapp_bot', password: 'secreto' }
const CONFIG_LLM = { apiKey: 'gsk_prueba', modelo: 'openai/gpt-oss-20b', timeoutMs: 50, nombre: 'Aioniq' }

type FetchFalso = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function respuestaHerramienta(nombre: string, argumentos: string, id = 'call_1'): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { tool_calls: [{ id, function: { name: nombre, arguments: argumentos } }] } }],
      usage: { prompt_tokens: 20, completion_tokens: 8 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function respuestaTexto(texto: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: texto } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function poolFalso() {
  const registros: string[] = []
  const cliente: ClientePg = {
    query: async (sql) => {
      registros.push(sql)
      return { rows: [] }
    },
    release: () => {},
  }
  return { registros, pool: { connect: async () => cliente } }
}

/** Enrutado: el fetch falso devuelve SIEMPRE la intención dada, en cualquier ronda. */
function enrutadorCon(herramienta: string, argumentos: string) {
  const pool = poolFalso()
  const cliente = new ClienteGroq(CONFIG_LLM, (async () => respuestaHerramienta(herramienta, argumentos)) as unknown as typeof fetch, () => {})
  const datos = new DatosBot(CONFIG, pool.pool)
  return { cliente, datos, store: new StoreLlm(), pool }
}

describe('saludo y aclaración (IA7/S13)', () => {
  it('el saludo no tiene números ni numeración y nombra las cuatro capacidades', () => {
    expect(SALUDO).not.toMatch(/\d/)
    expect(SALUDO).toContain('cómo va un pedido')
    expect(SALUDO).toContain('papel del trabajo')
    expect(SALUDO).toContain('cuenta de cobro')
    expect(SALUDO).toContain('tomar un pedido nuevo')
    expect(SALUDO).toContain('el laboratorio te llame')
    expect(SALUDO).not.toMatch(/^\s*\d+[.)]/m)
  })

  it('la aclaración no tiene números y nombra las mismas capacidades, como pregunta', () => {
    expect(PREGUNTA_ACLARAR).not.toMatch(/\d/)
    expect(PREGUNTA_ACLARAR).toContain('cómo va un pedido')
    expect(PREGUNTA_ACLARAR).toContain('cuenta de cobro')
    expect(PREGUNTA_ACLARAR).toContain('tomar un pedido nuevo')
    expect(PREGUNTA_ACLARAR).toContain('el laboratorio te llame')
    expect(PREGUNTA_ACLARAR.trim().endsWith('¿Qué necesitas?')).toBe(true)
  })
})

describe('el modelo enruta lo que la persona escribe (IA7/S13)', () => {
  const casos: Array<[string, string, string, Ruta]> = [
    ['el 1', '1', 'ver_pedido', { tipo: 'ver_pedido' }],
    ['la A', 'la A', 'ver_pedido', { tipo: 'ver_pedido' }],
    ['frase natural', 'quiero ver mi pedido', 'ver_pedido', { tipo: 'ver_pedido' }],
    ['cuenta con número', 'mándame la cuenta de la 1234', 'enviar_cuenta', { tipo: 'enviar_cuenta', numero: '1234' }],
    ['pedido nuevo', 'hazme un pedido', 'nuevo_pedido', { tipo: 'nuevo_pedido' }],
  ]
  for (const [nombre, mensaje, herramienta, ruta] of casos) {
    it(`${nombre} ("${mensaje}") → ruta ${herramienta}, cero consultas a la base`, async () => {
      const { cliente, datos, store, pool } = enrutadorCon(herramienta, herramienta === 'enviar_cuenta' ? '{"numero":"1234"}' : '{}')
      const r = await cliente.manejar('tel', mensaje, datos, '42', store)
      expect(r).toEqual({ ruta })
      expect(pool.registros).toEqual([])
    })
  }

  it('una intención en la primera ronda no ejecuta las otras herramientas de la misma tanda', async () => {
    const fetchDoble: FetchFalso = async () =>
      new Response(
        JSON.stringify({
          choices: [{
            message: {
              tool_calls: [
                { id: 'c1', function: { name: 'nuevo_pedido', arguments: '{}' } },
                { id: 'c2', function: { name: 'estado_orden', arguments: '{"orden":"7"}' } },
              ],
            },
          }],
          usage: { prompt_tokens: 20, completion_tokens: 8 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    const pool = poolFalso()
    const cliente = new ClienteGroq(CONFIG_LLM, fetchDoble as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool.pool)
    const r = await cliente.manejar('tel', 'hazme un pedido y dime de la 7', datos, '42', new StoreLlm())
    expect(r).toEqual({ ruta: { tipo: 'nuevo_pedido' } })
    expect(pool.registros).toEqual([])
  })
})

describe('mensajes sin acción: aclarar, no adivinar (IA7)', () => {
  for (const mensaje of ['lo de ayer', 'eso que te pedí', 'ayúdame', 'hola']) {
    it(`"${mensaje}" → una sola pregunta de aclaración, sin herramienta de datos`, async () => {
      const fetchTexto: FetchFalso = async () => respuestaTexto('Claro, con gusto te ayudo con eso.')
      const pool = poolFalso()
      const cliente = new ClienteGroq(CONFIG_LLM, fetchTexto as unknown as typeof fetch, () => {})
      const datos = new DatosBot(CONFIG, pool.pool)
      const store = new StoreLlm()
      // Ya hubo conversación: el mensaje no nombra acción y toca aclarar.
      store.set('tel', { historial: [{ role: 'user', content: 'hola' }, { role: 'assistant', content: SALUDO }], tokens: 0, expiresAt: Date.now() + 60_000 })
      const r = await cliente.manejar('tel', mensaje, datos, '42', store)
      expect(r).toEqual({ texto: PREGUNTA_ACLARAR })
      expect(pool.registros).toEqual([])
    })
  }
})

describe('sin modelo disponible: el menú numerado es la red de seguridad (IA7)', () => {
  it('texto suelto en el saludo cae al menú determinista, nunca mudo', async () => {
    const { flows } = par(apiFalso())
    const r = await flows.handle(TEL, 'quiero algo')
    expect(r.kind).toBe('text')
    expect(texto(r)).toContain('No entendí')
    expect(texto(r)).toContain(buildMenu())
  })
})

describe('el escape vuelve al saludo desde cualquier paso (IA7)', () => {
  for (const palabra of ['menú', 'menu', 'volver', 'inicio', '0']) {
    it(`"${palabra}" en un paso de lectura y en un paso de la orden devuelve el saludo`, async () => {
      const api = apiFalso()
      const { flows, esc, store } = par(api)
      await flows.handle(TEL, '1')
      const r = await flows.handle(TEL, palabra)
      expect(texto(r)).toBe(SALUDO)
      expect(store.get(TEL)).toBeUndefined()
      await esc.handle(TEL, '4')
      await esc.handle(TEL, '1')
      const r2 = await esc.handle(TEL, palabra)
      expect(texto(r2)).toBe(SALUDO)
      expect(store.get(TEL)).toBeUndefined()
    })
  }
})

describe('el flujo determinista es el ejecutor de la ruta (IA7)', () => {
  it('nuevo_pedido arranca el flujo de orden igual que la opción 4', async () => {
    const api = apiFalso()
    const { flows, store } = par(api)
    const r = await flows.atenderRuta(TEL, { tipo: 'nuevo_pedido' }, 'doc-1')
    expect(texto(r)).toContain('Paciente de Ana Gómez')
    expect(store.get(TEL)?.step).toBe('orden-paciente')
    expect(api.crearOrdenLlamadas).toHaveLength(0)
  })

  it('el pedido nuevo termina en resumen + confirmación y crea una sola vez', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    await flows.atenderRuta(TEL, { tipo: 'nuevo_pedido' }, 'doc-1')
    for (const paso of ['1', '1', '1', '2', '26', 'A1', 'no']) await flows.handle(TEL, paso)
    const r = await flows.handle(TEL, '1')
    expect(texto(r)).toContain('Orden 1234 creada.')
    expect(api.crearOrdenLlamadas).toHaveLength(1)
  })

  it('pedir_llamada pregunta antes de llamar y no toca el endpoint', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.atenderRuta(TEL, { tipo: 'pedir_llamada' })
    expect(texto(r)).toBe(PREGUNTA_AYUDA)
    expect(api.llamadasLlamada).toBe(0)
  })

  it('enviar_cuenta con número consulta la cuenta directo; sin número pregunta', async () => {
    const api = apiFalso()
    const { flows, store } = par(api)
    const conNumero = await flows.atenderRuta(TEL, { tipo: 'enviar_cuenta', numero: 'CC-1' })
    expect(texto(conNumero)).toContain('todavía no tiene el PDF disponible')
    const sinNumero = await flows.atenderRuta(TEL, { tipo: 'enviar_cuenta' })
    expect(texto(sinNumero)).toBe(PREGUNTA_CUENTA)
    expect(store.get(TEL)?.step).toBe('cuenta-numero')
  })

  it('ver_pedido sin número pide el número; con número muestra la orden', async () => {
    const api = apiFalso()
    const { flows, store } = par(api)
    const sinNumero = await flows.atenderRuta(TEL, { tipo: 'ver_pedido' })
    expect(texto(sinNumero)).toBe(PREGUNTA_PEDIDO)
    expect(store.get(TEL)?.step).toBe('pedido-numero')
    const conNumero = await flows.atenderRuta(TEL, { tipo: 'ver_pedido', numero: '7' })
    expect(texto(conNumero)).toContain('Estado: Producción')
  })
})
