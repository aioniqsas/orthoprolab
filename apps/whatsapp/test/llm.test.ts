import { describe, expect, it } from 'bun:test'
import { configuracionDesdeEntorno, DatosBot, type ClientePg } from '../src/datos'
import { ClienteGroq, configuracionLlm, LIMITE_COSTO, NO_PUEDO, redactar, StoreLlm, validarLlamada, type RegistroLlm } from '../src/llm'

const CONFIG = { host: 'db', port: 5432, database: 'orthopro', user: 'whatsapp_bot', password: 'secreto' }

interface LlamadaFetch {
  url: string
  cuerpo: string
}

/** Pool falso: devuelve una fila por orden consultada. */
function poolFalso() {
  const registros: string[] = []
  const cliente: ClientePg = {
    query: async (sql) => {
      registros.push(sql)
      return { rows: /FROM orden/.test(sql) ? [{ id: 7, estado: 'creada' }] : [] }
    },
    release: () => {},
  }
  return { registros, pool: { connect: async () => cliente } }
}

function respuestaGroq(texto: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: texto } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
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

const CONFIG_LLM = { apiKey: 'gsk_prueba', modelo: 'llama-3.3-70b-versatile', timeoutMs: 50 }

/** Firma de fetch que Bun exige (preconnect) pero los dobles no implementan. */
type FetchFalso = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function montar(fetchFn: FetchFalso, pool = poolFalso()) {
  const auditoria: RegistroLlm[] = []
  const cliente = new ClienteGroq(CONFIG_LLM, fetchFn as unknown as typeof fetch, (r) => auditoria.push(r))
  const datos = new DatosBot(CONFIG, pool.pool)
  const store = new StoreLlm()
  return { auditoria, cliente, datos, store, pool }
}

describe('configuración (S4)', () => {
  it('sin llave o con la bandera apagada no hay LLM', () => {
    expect(configuracionLlm({})).toBeNull()
    expect(configuracionLlm({ GROQ_API_KEY: 'gsk', WHATSAPP_LLM_ENABLED: 'false' })).toBeNull()
  })
  it('con llave y bandera por defecto hay LLM con el modelo por defecto', () => {
    expect(configuracionLlm({ GROQ_API_KEY: 'gsk' })).toEqual({
      apiKey: 'gsk',
      modelo: 'llama-3.3-70b-versatile',
      timeoutMs: expect.any(Number),
    })
  })
})

describe('validación de llamadas (S3)', () => {
  it('herramienta desconocida, tipo errado, clave extra y clinica_id se rechazan', () => {
    expect(validarLlamada('borrar_orden', {})).toEqual({ ok: false })
    expect(validarLlamada('estado_orden', { orden: 7 })).toEqual({ ok: false })
    expect(validarLlamada('estado_orden', { orden: '7', extra: 'x' })).toEqual({ ok: false })
    expect(validarLlamada('estado_orden', { orden: '7', clinica_id: '42' })).toEqual({ ok: false })
    expect(validarLlamada('estado_orden', { orden: '7777777777777777777777' })).toEqual({ ok: false })
  })
  it('una llamada con esquema exacto pasa', () => {
    expect(validarLlamada('estado_orden', { orden: '7' })).toEqual({ ok: true, entrada: '7' })
    expect(validarLlamada('listar_doctores', {})).toEqual({ ok: true, entrada: null })
  })
})

describe('fallos del proveedor → fallback al menú (IA3 punto 2)', () => {
  it('timeout (fetch lanza) → null, tras un solo reintento', async () => {
    let intentos = 0
    const fetchLento: FetchFalso = () => {
      intentos++
      throw new Error('AbortError')
    }
    const { cliente, datos, store } = montar(fetchLento)
    const r = await cliente.manejar('tel', 'hola', datos, '42', store)
    expect(r).toEqual({ texto: null })
    expect(intentos).toBe(2)
  })

  it('HTTP 500 → null', async () => {
    const fetch500: FetchFalso = async () => new Response('no', { status: 500 })
    const { cliente, datos, store } = montar(fetch500)
    expect(await cliente.manejar('tel', 'hola', datos, '42', store)).toEqual({ texto: null })
  })

  it('respuesta malformada (sin choices, sin contenido) → null', async () => {
    const fetchMalo: FetchFalso = async () =>
      new Response(JSON.stringify({ choices: [] }), { status: 200 })
    const { cliente, datos, store } = montar(fetchMalo)
    expect(await cliente.manejar('tel', 'hola', datos, '42', store)).toEqual({ texto: null })
  })
})

describe('llamada válida ejecuta la herramienta', () => {
  it('estado_orden corre la consulta y el modelo responde con el texto final', async () => {
    let fase = 0
    const fetchFake: FetchFalso = async (_url, init) => {
      fase++
      return fase === 1 ? respuestaHerramienta('estado_orden', '{"orden":"7"}') : respuestaGroq('La orden 7 está creada.')
    }
    const { cliente, datos, store, pool } = montar(fetchFake)
    const r = await cliente.manejar('tel', '¿cómo va la orden 7?', datos, '42', store)
    expect(r).toEqual({ texto: 'La orden 7 está creada.' })
    // La capa de datos sí fue consultada, con clínica verificada.
    expect(pool.registros.some((s) => s.includes('FROM orden'))).toBe(true)
  })
})

describe('llamadas inválidas no tocan la base', () => {
  const casos: Array<[string, string, string]> = [
    ['herramienta desconocida', 'borrar_orden', '{}'],
    ['tipo errado', 'estado_orden', '{"orden":7}'],
    ['clave extra', 'estado_orden', '{"orden":"7","extra":"x"}'],
    ['clinica_id inyectada', 'estado_orden', '{"orden":"7","clinica_id":"99"}'],
  ]
  for (const [nombre, herramienta, argumentos] of casos) {
    it(`${nombre} → negativa sin consultas`, async () => {
      const fetchFake: FetchFalso = async () => respuestaHerramienta(herramienta, argumentos)
      const { cliente, datos, store, pool } = montar(fetchFake)
      const r = await cliente.manejar('tel', 'sabotaje', datos, '42', store)
      expect(r).toEqual({ texto: NO_PUEDO })
      expect(pool.registros).toEqual([])
    })
  }
})

describe('bucle acotado y tope de costo (IA3 punto 4)', () => {
  it('máximo 2 rondas: si el modelo insiste en herramientas, se cierra', async () => {
    let llamadas = 0
    const fetchFake: FetchFalso = async () => {
      llamadas++
      return respuestaHerramienta('estado_orden', '{"orden":"7"}', `call_${llamadas}`)
    }
    const { cliente, datos, store } = montar(fetchFake)
    const r = await cliente.manejar('tel', 'insiste', datos, '42', store)
    expect(llamadas).toBe(2)
    expect(r).not.toBeNull()
    expect(r.texto).not.toBe('')
  })

  it('pasado el tope de tokens se niega con cortesía, sin llamar al modelo', async () => {
    let llamadas = 0
    const fetchFake: FetchFalso = async () => {
      llamadas++
      return respuestaGroq('hola')
    }
    const { cliente, datos, store } = montar(fetchFake)
    store.set('tel', { historial: [], tokens: 5000, expiresAt: Date.now() + 60_000 })
    const r = await cliente.manejar('tel', 'hola', datos, '42', store)
    expect(r).toEqual({ texto: LIMITE_COSTO })
    expect(llamadas).toBe(0)
  })

  it('los tokens consumidos se acumulan en la conversación', async () => {
    const { cliente, datos, store } = montar(async () => respuestaGroq('hola'))
    await cliente.manejar('tel', 'hola', datos, '42', store)
    expect(store.get('tel')?.tokens).toBe(15)
  })
})

describe('nada sensible sale en el prompt (IA3 punto 5)', () => {
  it('el cuerpo serializado no contiene teléfono, JWT ni DSN', async () => {
    const capturadas: LlamadaFetch[] = []
    const fetchFake: FetchFalso = async (url, init) => {
      capturadas.push({ url: String(url), cuerpo: String(init?.body ?? '') })
      return respuestaGroq('hola')
    }
    const { cliente, datos, store } = montar(fetchFake)
    await cliente.manejar('tel', 'Mi teléfono +573001112233, token eyJabc.def.ghi y dsn postgres://u:p@db/x', datos, '42', store)
    const cuerpo = capturadas[0]!.cuerpo
    expect(cuerpo).not.toContain('+573001112233')
    expect(cuerpo).not.toContain('eyJabc')
    expect(cuerpo).not.toContain('postgres://u:p@db/x')
    expect(cuerpo).toContain('[teléfono]')
    expect(cuerpo).toContain('[token]')
  })
})

describe('historial recortado', () => {
  it('con muchos turnos previos, el prompt no crece sin límite', async () => {
    const capturadas: LlamadaFetch[] = []
    const fetchFake: FetchFalso = async (_url, init) => {
      capturadas.push({ url: String(_url), cuerpo: String(init?.body ?? '') })
      return respuestaGroq('ok')
    }
    const { cliente, datos, store } = montar(fetchFake)
    const historial = []
    for (let i = 0; i < 30; i++) {
      historial.push({ role: 'user' as const, content: `turno ${i}` })
      historial.push({ role: 'assistant' as const, content: `respuesta ${i}` })
    }
    store.set('tel', { historial, tokens: 0, expiresAt: Date.now() + 60_000 })
    await cliente.manejar('tel', 'otra', datos, '42', store)
    const mensajes = JSON.parse(capturadas[0]!.cuerpo).messages as unknown[]
    // system + últimos 16 turnos + el nuevo mensaje.
    expect(mensajes.length).toBeLessThanOrEqual(18)
    expect(JSON.stringify(mensajes)).not.toContain('turno 0')
  })
})

describe('auditoría (IA3 punto 6)', () => {
  it('registra intención, herramienta, tokens y desenlace, sin cuerpos', async () => {
    let fase = 0
    const fetchFake: FetchFalso = async () => {
      fase++
      return fase === 1 ? respuestaHerramienta('estado_orden', '{"orden":"7"}') : respuestaGroq('listo')
    }
    const { cliente, datos, store, auditoria } = montar(fetchFake)
    await cliente.manejar('tel', 'consulta con secreto', datos, '42', store)
    expect(auditoria).toEqual([
      { intencion: 'conversacion', herramienta: 'estado_orden', tokensEntrada: 20, tokensSalida: 8, resultado: 'herramienta_ok' },
      { intencion: 'conversacion', herramienta: null, tokensEntrada: 10, tokensSalida: 5, resultado: 'texto' },
    ])
    expect(JSON.stringify(auditoria)).not.toContain('secreto')
  })
})

describe('redacción defensiva', () => {
  it('teléfono, JWT, DSN y Bearer se sustituyen', () => {
    expect(redactar('+573001112233')).toBe('[teléfono]')
    expect(redactar('Bearer abc.def')).toBe('[token]')
    expect(redactar('redis://:pass@host')).toBe('[dsn]')
    expect(redactar('orden 7')).toBe('orden 7')
  })
})
