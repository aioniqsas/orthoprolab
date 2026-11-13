/**
 * Memoria de conversación en Redis (S1, T1 de whatsapp-agente). Cada turno del
 * usuario y cada respuesta del bot se guardan por número (también los que
 * atiende un flujo). El TTL de 86400 s se renueva en cada interacción, así que
 * la memoria vive 24 h desde la última interacción y sobrevive a un reinicio
 * del bot. Al modelo le llegan los últimos 10 intercambios (10 pares
 * usuario/bot). Con Redis caído el bot responde sin memoria y nunca se cae.
 *
 * Cliente Redis nativo de Bun (Bun 1.4.2), sin dependencia nueva.
 */

export const TTL_MEMORIA_S = 24 * 60 * 60
export const MAX_INTERCAMBIOS = 10
export const MAX_MENSAJES = MAX_INTERCAMBIOS * 2

// Redis muerto o lento (el cliente real de Bun puede tardar decenas de segundos
// en fallar) no debe retrasar la respuesta al usuario: cada operación se acota
// en tiempo y, si vence el plazo, se degrada a "sin memoria" (perder la
// escritura es aceptable). Así el bot sigue respondiendo sin memoria.
export const PLAZO_REDIS_MS = 250

export type MensajeMemoria = { role: 'user' | 'assistant'; content: string }

/** Subconjunto del cliente Redis nativo de Bun que usa la memoria. */
export interface ClienteRedis {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<unknown>
  expire(key: string, seconds: number): Promise<unknown>
  rpush(key: string, ...values: string[]): Promise<unknown>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  ltrim(key: string, start: number, stop: number): Promise<unknown>
  del(...keys: string[]): Promise<unknown>
  ping(): Promise<unknown>
  close?(): void
}

function clave(telefono: string): string {
  return `whatsapp:memoria:${telefono}`
}

function claveTokens(telefono: string): string {
  return `whatsapp:memoria:tokens:${telefono}`
}

function parseMensaje(valor: string): MensajeMemoria | null {
  try {
    const dato = JSON.parse(valor) as { role?: unknown; content?: unknown }
    if ((dato.role === 'user' || dato.role === 'assistant') && typeof dato.content === 'string') {
      return { role: dato.role, content: dato.content }
    }
  } catch {
    // Entrada corrupta: se ignora sin tumbar la conversación.
  }
  return null
}

/**
 * Acota una promesa de Redis en el tiempo. Si vence el plazo devuelve el valor
 * por defecto (degradación a sin memoria); la promesa original queda con
 * catch para que un rechazo tardío no sea unhandled rejection. Perder el
 * resultado (p. ej. una escritura) es aceptable: responder a tiempo no lo es.
 */
async function conPlazo<T>(promesa: Promise<T>, ms: number, defecto: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limite = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(defecto), ms)
  })
  void promesa.catch(() => {})
  try {
    return await Promise.race([promesa, limite])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/** URL de Redis desde el entorno, o undefined si no hay configuración. */
export function urlRedis(env: Record<string, string | undefined> = process.env): string | undefined {
  const directa = env.WHATSAPP_REDIS_URL ?? env.REDIS_URL
  if (directa) return directa
  const host = env.REDIS_HOST
  if (!host) return undefined
  const port = env.REDIS_PORT ?? '6379'
  const pass = env.REDIS_PASSWORD
  const auth = pass ? `:${encodeURIComponent(pass)}@` : ''
  return `redis://${auth}${host}:${port}`
}

/** Intenta crear el cliente nativo de Bun; null si Redis no está disponible. */
export function crearClienteRedis(env: Record<string, string | undefined> = process.env): ClienteRedis | null {
  const url = urlRedis(env)
  if (!url) return null
  try {
    const bun = (globalThis as any).Bun ?? require('bun')
    const Ctor = bun?.RedisClient
    if (!Ctor) return null
    const cliente = new Ctor(url) as ClienteRedis
    // Ping temprano y no bloqueante: detectar caídas sin impedir responder.
    void Promise.resolve().then(() => cliente.ping()).catch(() => {})
    return cliente
  } catch {
    return null
  }
}

/**
 * Memoria persistente de conversación. Cada método degrada en silencio cuando
 * Redis no está (cliente null o error/timeout en tiempo de ejecución): el bot
 * sigue respondiendo sin memoria y nunca se cae.
 */
export class MemoriaConversacion {
  constructor(
    private readonly redis: ClienteRedis | null = null,
    private readonly plazoMs = PLAZO_REDIS_MS,
  ) {}

  get disponible(): boolean {
    return this.redis !== null
  }

  /** Últimos mensajes guardados (hasta 10 intercambios = 20 turnos). */
  async obtener(telefono: string): Promise<MensajeMemoria[]> {
    if (!this.redis) return []
    try {
      const crudos = await conPlazo(
        this.redis.lrange(clave(telefono), -MAX_MENSAJES, -1),
        this.plazoMs,
        [] as string[],
      )
      const mensajes: MensajeMemoria[] = []
      for (const crudo of crudos) {
        const m = parseMensaje(crudo)
        if (m) mensajes.push(m)
      }
      return mensajes
    } catch {
      return []
    }
  }

  /** Registra un turno y renueva el TTL deslizante de 24 h. */
  async registrar(telefono: string, mensaje: MensajeMemoria): Promise<void> {
    if (!this.redis) return
    try {
      const k = clave(telefono)
      await conPlazo(
        (async () => {
          await this.redis!.rpush(k, JSON.stringify(mensaje))
          await this.redis!.ltrim(k, -MAX_MENSAJES, -1)
          await this.redis!.expire(k, TTL_MEMORIA_S)
        })(),
        this.plazoMs,
        undefined,
      )
      // Si venció el plazo, la escritura pudo perderse (aceptable): el bot ya respondió.
    } catch {
      // Redis caído o error transitorio: se responde sin memoria, nunca se cae.
    }
  }

  /** Registra un intercambio completo (usuario + respuesta del bot). */
  async registrarIntercambio(telefono: string, usuario: string, asistente: string): Promise<void> {
    if (!this.redis) return
    try {
      const k = clave(telefono)
      await conPlazo(
        (async () => {
          await this.redis!.rpush(
            k,
            JSON.stringify({ role: 'user', content: usuario } satisfies MensajeMemoria),
            JSON.stringify({ role: 'assistant', content: asistente } satisfies MensajeMemoria),
          )
          await this.redis!.ltrim(k, -MAX_MENSAJES, -1)
          await this.redis!.expire(k, TTL_MEMORIA_S)
        })(),
        this.plazoMs,
        undefined,
      )
      // Si venció el plazo, la escritura pudo perderse (aceptable): el bot ya respondió.
    } catch {
      // Redis caído: degradación silenciosa.
    }
  }

  async tokens(telefono: string): Promise<number> {
    if (!this.redis) return 0
    try {
      const valor = await conPlazo(this.redis.get(claveTokens(telefono)), this.plazoMs, null as string | null)
      const n = Number(valor)
      return Number.isFinite(n) && n >= 0 ? n : 0
    } catch {
      return 0
    }
  }

  async guardarTokens(telefono: string, tokens: number): Promise<void> {
    if (!this.redis) return
    try {
      const k = claveTokens(telefono)
      await conPlazo(
        (async () => {
          await this.redis!.set(k, String(tokens))
          await this.redis!.expire(k, TTL_MEMORIA_S)
        })(),
        this.plazoMs,
        undefined,
      )
      // Si venció el plazo, se pierde el conteo (aceptable); el bot no se cae.
    } catch {
      // Redis caído: el tope de costo se pierde entre reinicios, pero el bot no cae.
    }
  }

  async limpiar(telefono: string): Promise<void> {
    if (!this.redis) return
    try {
      await conPlazo(
        (async () => {
          await this.redis!.del(clave(telefono))
          await this.redis!.del(claveTokens(telefono))
        })(),
        this.plazoMs,
        undefined,
      )
    } catch {
      // degradación silenciosa
    }
  }
}
