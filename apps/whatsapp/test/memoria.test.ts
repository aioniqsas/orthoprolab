import { describe, expect, it } from 'bun:test'
import {
  MAX_INTERCAMBIOS,
  MAX_MENSAJES,
  MemoriaConversacion,
  PLAZO_REDIS_MS,
  TTL_MEMORIA_S,
  type ClienteRedis,
  type MensajeMemoria,
} from '../src/memoria'
import { ClienteGroq, StoreLlm } from '../src/llm'
import { DatosBot, type ClientePg } from '../src/datos'
import { SALUDO } from '\.\./src/mensajes.js'

/** Redis falso en memoria: guarda listas, valores y TTLs para verificar S1. */
function redisFalso(opts: { falla?: boolean } = {}): ClienteRedis & {
  listas: Map<string, string[]>
  valores: Map<string, string>
  ttls: Map<string, number>
} {
  const listas = new Map<string, string[]>()
  const valores = new Map<string, string>()
  const ttls = new Map<string, number>()
  const boom = () => {
    if (opts.falla) throw new Error('redis caído')
  }
  return {
    listas,
    valores,
    ttls,
    async get(key) {
      boom()
      return valores.get(key) ?? null
    },
    async set(key, value) {
      boom()
      valores.set(key, value)
      return 'OK'
    },
    async expire(key, seconds) {
      boom()
      ttls.set(key, seconds)
      return 1
    },
    async rpush(key, ...values) {
      boom()
      const lista = listas.get(key) ?? []
      lista.push(...values)
      listas.set(key, lista)
      return lista.length
    },
    async lrange(key, start, stop) {
      boom()
      const lista = listas.get(key) ?? []
      const s = start < 0 ? Math.max(lista.length + start, 0) : start
      const e = stop < 0 ? lista.length + stop : stop
      return lista.slice(s, e + 1)
    },
    async ltrim(key, start, stop) {
      boom()
      const lista = listas.get(key) ?? []
      const s = start < 0 ? Math.max(lista.length + start, 0) : start
      const e = stop < 0 ? lista.length + stop : stop
      listas.set(key, lista.slice(s, e + 1))
      return 'OK'
    },
    async del(...keys) {
      boom()
      let n = 0
      for (const k of keys) {
        if (listas.delete(k)) n++
        if (valores.delete(k)) n++
        ttls.delete(k)
      }
      return n
    },
    async ping() {
      boom()
      return 'PONG'
    },
  }
}

const TEL = '+573001234567'

describe('S1/T1 — memoria de conversación en Redis', () => {
  it('guarda cada turno del usuario y cada respuesta del bot por número', async () => {
    const redis = redisFalso()
    const memoria = new MemoriaConversacion(redis)
    await memoria.registrarIntercambio(TEL, 'hola', '¿en qué te ayudo?')
    await memoria.registrarIntercambio(TEL, 'quiero mi pedido', 'te muestro tu pedido')

    const mensajes = await memoria.obtener(TEL)
    expect(mensajes).toEqual([
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: '¿en qué te ayudo?' },
      { role: 'user', content: 'quiero mi pedido' },
      { role: 'assistant', content: 'te muestro tu pedido' },
    ])
  })

  it('registra también los turnos que atiende un flujo (vía intercambio explícito)', async () => {
    const redis = redisFalso()
    const memoria = new MemoriaConversacion(redis)
    // Un turno de flujo: el usuario escribe "1" y el bot responde la pregunta del paso.
    await memoria.registrarIntercambio(TEL, '1', 'Escribe el número de la orden (o 0 para volver al menú).')
    await memoria.registrarIntercambio(TEL, '1234', 'Orden 1234\nEstado: Creada')

    const mensajes = await memoria.obtener(TEL)
    expect(mensajes).toHaveLength(4)
    expect(mensajes[0]).toEqual({ role: 'user', content: '1' })
    expect(mensajes[3]).toEqual({ role: 'assistant', content: 'Orden 1234\nEstado: Creada' })
  })

  it('renueva el TTL de 86400 s en cada interacción', async () => {
    const redis = redisFalso()
    const memoria = new MemoriaConversacion(redis)
    await memoria.registrarIntercambio(TEL, 'hola', 'hola')

    expect(redis.ttls.get(`whatsapp:memoria:${TEL}`)).toBe(TTL_MEMORIA_S)
    expect(TTL_MEMORIA_S).toBe(86_400)

    // Otra interacción renueva el TTL.
    redis.ttls.set(`whatsapp:memoria:${TEL}`, 1)
    await memoria.registrarIntercambio(TEL, 'otra vez', 'claro')
    expect(redis.ttls.get(`whatsapp:memoria:${TEL}`)).toBe(TTL_MEMORIA_S)
  })

  it('al modelo le llegan los últimos 10 intercambios (20 turnos)', async () => {
    const redis = redisFalso()
    const memoria = new MemoriaConversacion(redis)
    for (let i = 1; i <= 12; i++) {
      await memoria.registrarIntercambio(TEL, `usuario ${i}`, `bot ${i}`)
    }

    const mensajes = await memoria.obtener(TEL)
    expect(mensajes).toHaveLength(MAX_MENSAJES)
    expect(MAX_INTERCAMBIOS).toBe(10)
    // Se conservan los 10 más recientes: del 3 al 12.
    expect(mensajes[0]).toEqual({ role: 'user', content: 'usuario 3' })
    expect(mensajes[1]).toEqual({ role: 'assistant', content: 'bot 3' })
    expect(mensajes[mensajes.length - 2]).toEqual({ role: 'user', content: 'usuario 12' })
    expect(mensajes[mensajes.length - 1]).toEqual({ role: 'assistant', content: 'bot 12' })
  })

  it('la memoria sobrevive a un reinicio del bot (otra instancia, mismo Redis)', async () => {
    const redis = redisFalso()
    const antes = new MemoriaConversacion(redis)
    await antes.registrarIntercambio(TEL, '¿cómo va mi pedido?', 'va en producción')

    // "Reinicio": una instancia nueva del bot lee la misma memoria persistente.
    const despues = new MemoriaConversacion(redis)
    const mensajes = await despues.obtener(TEL)
    expect(mensajes).toEqual([
      { role: 'user', content: '¿cómo va mi pedido?' },
      { role: 'assistant', content: 'va en producción' },
    ])
  })

  it('con Redis caído el bot responde sin memoria y nunca se cae', async () => {
    const caido = new MemoriaConversacion(null)
    await expect(caido.obtener(TEL)).resolves.toEqual([])
    await expect(caido.registrarIntercambio(TEL, 'hola', 'hola')).resolves.toBeUndefined()
    await expect(caido.registrar(TEL, { role: 'user', content: 'x' })).resolves.toBeUndefined()
    await expect(caido.tokens(TEL)).resolves.toBe(0)
    await expect(caido.guardarTokens(TEL, 10)).resolves.toBeUndefined()
    await expect(caido.limpiar(TEL)).resolves.toBeUndefined()

    const queFalla = new MemoriaConversacion(redisFalso({ falla: true }))
    await expect(queFalla.obtener(TEL)).resolves.toEqual([])
    await expect(queFalla.registrarIntercambio(TEL, 'hola', 'hola')).resolves.toBeUndefined()
    await expect(queFalla.tokens(TEL)).resolves.toBe(0)
    await expect(queFalla.guardarTokens(TEL, 10)).resolves.toBeUndefined()
  })
})

type FetchFalso = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
const CONFIG = { host: 'db', port: 5432, database: 'orthopro', user: 'whatsapp_bot', password: 'secreto' }
const CONFIG_LLM = { apiKey: 'gsk_prueba', modelo: 'openai/gpt-oss-20b', timeoutMs: 50, nombre: 'Aioniq' }

function respuestaTexto(texto: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: texto } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function poolFalso() {
  const cliente: ClientePg = { query: async () => ({ rows: [] }), release: () => {} }
  return { pool: { connect: async () => cliente } }
}

describe('S1 — el modelo recibe los últimos 10 intercambios de la memoria', () => {
  it('envía al modelo el historial persistido (incluye turnos previos) acotado a 10 intercambios', async () => {
    const redis = redisFalso()
    const memoria = new MemoriaConversacion(redis)
    // 12 intercambios previos ya guardados (p. ej. de flujos o sesiones anteriores).
    for (let i = 1; i <= 12; i++) {
      await memoria.registrarIntercambio(TEL, `usuario ${i}`, `bot ${i}`)
    }

    const capturas: string[] = []
    const fetchFake: FetchFalso = async (_url, init) => {
      capturas.push(String(init?.body ?? ''))
      return respuestaTexto('respuesta final')
    }
    const { pool } = poolFalso()
    const cliente = new ClienteGroq(CONFIG_LLM, fetchFake as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool)
    const store = new StoreLlm(undefined, undefined, memoria)

    // Ya hay conversación previa, así que el modelo debe ver los 10 más recientes (3..12) + el mensaje nuevo.
    store // no-op, mantiene el store vivo
    // Forzar historial previo en memoria: ya está. La primera respuesta de texto libre en ronda 0
    // con historial previo devuelve aclaración, pero el prompt enviado debe contener el historial.
    await cliente.manejar(TEL, 'algo nuevo', datos, '42', store)

    const mensajes = JSON.parse(capturas[0]!).messages as Array<{ role: string; content: string }>
    const contenidos = JSON.stringify(mensajes)
    // Debe incluir intercambios recientes y excluir los más viejos (1 y 2).
    expect(contenidos).toContain('"usuario 12"')
    expect(contenidos).toContain('"bot 12"')
    expect(contenidos).toContain('"usuario 3"')
    expect(contenidos).not.toContain('"usuario 1"')
    expect(contenidos).not.toContain('"bot 1"')
    expect(contenidos).not.toContain('"usuario 2"')
    // system + 20 turnos previos (10 intercambios) + mensaje nuevo = 22
    expect(mensajes.length).toBeLessThanOrEqual(22)
  })

  it('con Redis caído el modelo sigue respondiendo (sin memoria persistida)', async () => {
    const memoria = new MemoriaConversacion(redisFalso({ falla: true }))
    const { pool } = poolFalso()
    const cliente = new ClienteGroq(CONFIG_LLM, (async () => respuestaTexto('hola')) as unknown as typeof fetch, () => {})
    const datos = new DatosBot(CONFIG, pool)
    const store = new StoreLlm(undefined, undefined, memoria)

    // No debe lanzar: responde sin memoria (sin historial previo => saludo).
    const r = await cliente.manejar(TEL, 'hola', datos, '42', store)
    expect(r).toEqual({ texto: SALUDO })
  })
})


/** Redis falso cuyas operaciones nunca resuelven ni rechazan (simula un Redis colgado). */
function redisColgado(): ClienteRedis {
  const colgado = <T,>(): Promise<T> => new Promise<T>(() => {})
  return {
    get: () => colgado<string | null>(),
    set: () => colgado<unknown>(),
    expire: () => colgado<unknown>(),
    rpush: () => colgado<unknown>(),
    lrange: () => colgado<string[]>(),
    ltrim: () => colgado<unknown>(),
    del: () => colgado<unknown>(),
    ping: () => colgado<unknown>(),
  }
}

describe('S1 — Redis lento/colgado: cada operación se acota en tiempo', () => {
  it('el plazo es corto y está exportado (Redis muerto no debe retrasar ~31 s la respuesta)', () => {
    expect(PLAZO_REDIS_MS).toBeGreaterThan(0)
    expect(PLAZO_REDIS_MS).toBeLessThanOrEqual(1000)
  })

  it('registrar, registrarIntercambio, obtener, tokens, guardarTokens y limpiar resuelven dentro del plazo sin lanzar aunque Redis nunca responda', async () => {
    const memoria = new MemoriaConversacion(redisColgado(), 20)
    const limite = 500

    const medir = async <T,>(fn: () => Promise<T>): Promise<{ ms: number; valor: T }> => {
      const inicio = Date.now()
      const valor = await fn()
      return { ms: Date.now() - inicio, valor }
    }

    const r1 = await medir(() => memoria.registrar(TEL, { role: 'user', content: 'hola' }))
    const r2 = await medir(() => memoria.registrarIntercambio(TEL, 'hola', 'adiós'))
    const r3 = await medir(() => memoria.obtener(TEL))
    const r4 = await medir(() => memoria.tokens(TEL))
    const r5 = await medir(() => memoria.guardarTokens(TEL, 5))
    const r6 = await medir(() => memoria.limpiar(TEL))

    for (const r of [r1, r2, r3, r4, r5, r6]) {
      expect(r.ms).toBeLessThan(limite)
    }
    expect(r1.valor).toBeUndefined()
    expect(r2.valor).toBeUndefined()
    expect(r3.valor).toEqual([])
    expect(r4.valor).toBe(0)
    expect(r5.valor).toBeUndefined()
    expect(r6.valor).toBeUndefined()
  })
})
