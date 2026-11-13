import { NO_DISPONIBLE, NO_ENCONTRADO, type DatosBot } from './datos.js'
import { ejecutarHerramienta, type LlamadaHerramienta } from './herramientas.js'
import { PREGUNTA_ACLARAR, SALUDO } from './menu.js'
import {
  NOMBRE_BOT_DEFECTO,
  NEGATIVA_ESCRITURA,
  NEGATIVA_INFRAESTRUCTURA,
  NEGATIVA_FIJA,
  NEGATIVA_IDENTIDAD,
  NEGATIVA_NO_ENCONTRADO,
  NEGATIVA_SUPLANTACION,
  clasificarNegativa,
  construirPromptSistema,
  negativaIdentidad,
  type ClaseNegativa,
} from './prompt.js'
export { NEGATIVA_ESCRITURA, NEGATIVA_FIJA, NEGATIVA_IDENTIDAD, NEGATIVA_INFRAESTRUCTURA, NEGATIVA_NO_ENCONTRADO, NEGATIVA_SUPLANTACION, construirPromptSistema } from './prompt.js'

/**
 * Cliente Groq con tool calling (IA3, S4). Sin SDK: `fetch` es global. El
 * modelo nunca escribe SQL ni toca la base directamente: elige una
 * herramienta del catálogo cerrado de herramientas.ts, que se valida contra
 * el esquema declarado ANTES de ejecutarse. Cualquier fallo (bandera apagada,
 * sin llave, timeout, HTTP != 200, respuesta malformada) devuelve null y el
 * flujo determinista del menú atiende el mensaje: el bot no se cae con Groq.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODELO_DEFECTO = 'openai/gpt-oss-20b'
/** Timeout de una llamada (ms): un chat no puede esperar un minuto. */
const TIMEOUT_MS = 12_000
/** Máximo de rondas modelo→respuesta por mensaje del usuario. */
const MAX_RONDAS = 2
/** Tope de tokens (entrada+salida) acumulados por conversación. */
const LIMITE_TOKENS = 4_000
/** Turnos de historial enviados al modelo (recorte anti prompt infinito). */
const MAX_TURNOS_HISTORIAL = 8

export interface ConfigLlm {
  apiKey: string
  modelo: string
  timeoutMs: number
  /** Nombre con el que el bot responde quién es (IA7); hoy es constante, luego vendrá de la base. */
  nombre: string
}

/**
 * Configuración (S4). Null => el menú determinista atiende todo. `GROQ_API_KEY`
 * es obligatoria; `WHATSAPP_LLM_ENABLED` por defecto true (apagarla con
 * 'false' vuelve al menú sin desplegar).
 */
export function configuracionLlm(env: Record<string, string | undefined> = process.env): ConfigLlm | null {
  if ((env.WHATSAPP_LLM_ENABLED ?? 'true') === 'false') return null
  if (!env.GROQ_API_KEY) return null
  return {
    apiKey: env.GROQ_API_KEY,
    modelo: env.WHATSAPP_LLM_MODEL || MODELO_DEFECTO,
    timeoutMs: TIMEOUT_MS,
    nombre: NOMBRE_BOT_DEFECTO,
  }
}

/** Esquema declarado de cada herramienta: claves exactas y tipo de valor. */
type TipoParam = 'numero' | 'texto'
const ESQUEMAS: Record<string, Record<string, TipoParam>> = {
  estado_orden: { orden: 'numero' },
  ultima_orden_doctor: { doctor: 'numero' },
  cuenta_de_cobro: { numero: 'texto' },
  listar_doctores: {},
  listar_servicios: {},
  // Intenciones de enrutado (IA7/S13): la puerta, no la escritura. El
  // parámetro es opcional: sin número, el flujo determinista lo pregunta.
  ver_pedido: {},
  nuevo_pedido: {},
  pedir_llamada: {},
  enviar_control: { orden: 'numero' },
  enviar_cuenta: { numero: 'texto' },
  // Órdenes existentes (S2, S6, S7): el modelo elige la puerta y el mensaje
  // completo viaja al flujo, que reinterpreta paciente, número, día y cambios.
  // No hay herramienta SQL por nombre porque `paciente.nombre` está cifrado:
  // esa búsqueda va por la API, que sí descifra y ya filtra por clínica.
  buscar_orden: {},
  editar_orden: {},
}

/** Herramientas de intención: devuelven una ruta al flujo determinista, no consultan la base. */
const ES_INTENCION = new Set([
  'ver_pedido',
  'nuevo_pedido',
  'pedir_llamada',
  'enviar_control',
  'enviar_cuenta',
  'buscar_orden',
  'editar_orden',
])

/** Ruta decidida por el modelo; la ejecuta el flujo determinista (IA7). */
export type Ruta = {
  tipo:
    | 'ver_pedido'
    | 'enviar_control'
    | 'enviar_cuenta'
    | 'nuevo_pedido'
    | 'pedir_llamada'
    | 'buscar_orden'
    | 'editar_orden'
  numero?: string
  /** Texto original: el flujo lo reinterpreta completo antes de preguntar (S4). */
  texto?: string
}

/**
 * Prechequeo de intención (sabotaje en vivo: "hazme un pedido" no disparaba
 * la herramienta). Corre ANTES del modelo, tras la política de negativas:
 * reconoce las formas comunes de pedir cada acción en español, tolerante de
 * tildes y mayúsculas, y devuelve la misma ruta que el modelo habría
 * elegido; el flujo determinista la ejecuta igual que hoy. Todo lo que no
 * reconoce sigue al modelo. Con cualquier dígito presente devuelve null:
 * "¿cómo va la orden 1234?" y "mándame la cuenta 105" conservan su número
 * porque van por las herramientas/flujo, no por la ruta sin dato.
 */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function esPedidoDeOrden(t: string): boolean {
  return (
    /\b(crear|hacer|tomar|registrar)\s+(una\s+)?(orden|pedido)\b/.test(t) ||
    /\bnecesito\s+crear\b/.test(t) ||
    /\bhay\s+que\s+hacerle\b/.test(t) ||
    /\b(hazme|haceme)\s+(un|una)\s+pedido\b/.test(t) ||
    /\b(nuevo|nueva)\s+(pedido|orden)\b/.test(t)
  )
}

export function prechequeoRuta(texto: string): Ruta | null {
  const t = normalizar(texto)
  if (t === '') return null
  // Un pedido de trabajo trae números de dientes ("prótesis de los 14 y 13") y
  // sigue siendo un pedido: se reconoce antes de descartar por dígitos. El
  // resto de mensajes con números va al modelo, que sí sabe extraer el dato
  // ("mándame la cuenta de la 1234").
  if (esPedidoDeOrden(t)) return { tipo: 'nuevo_pedido', texto }
  // Cambiar algo de una orden que ya existe (S3): quitar o agregar dientes, la
  // cantidad o el color. Va antes del descarte por dígitos: el mensaje los trae.
  if (
    /\b(quita\w*|quitar\w*|saca\w*|sacar\w*|elimina\w*|eliminar\w*|agrega\w*|agregar\w*|a[ñn]ade\w*|a[ñn]adir\w*|suma\w*|sumar\w*|pon\w*|cambia\w*|cambiar\w*|modifica\w*|modificar\w*|ya\s+no\s+(?:vamos\s+a\s+hacer(?:le)?|hay\s+que\s+hacer(?:le)?))\b/.test(t) &&
    /\b(orden|pedido|trabajo|diente|dientes)\b/.test(t)
  ) return { tipo: 'editar_orden', texto }
  // "la orden 18", "la orden 18 de Sara": identificar una orden concreta (S6),
  // y "¿cómo va la orden 7?" sigue yendo por las herramientas: ahí hay pregunta.
  if (/^(?:la|el)\s+(?:orden|pedido)\b/.test(t)) return { tipo: 'buscar_orden', texto }
  if (/\d/.test(t)) return null
  // Hablar de una orden concreta por paciente o por día (S2, S7). Con un número
  // la consulta va por las herramientas de siempre, que ya lo resuelven.
  if (/\b(orden|pedido)\b/.test(t) && /\b(de|del|para)\s+\p{L}/u.test(t)) return { tipo: 'buscar_orden', texto }
  if (/\b(orden|pedido|trabajo)\b/.test(t) && /\b(hoy|ayer|anteayer|antier|lunes|martes|miercoles|jueves|viernes|sabado|domingo|semana)\b/.test(t)) {
    return { tipo: 'buscar_orden', texto }
  }
  if (/\bque\s+me\s+llame[nr]?\b/.test(t) || /\b(llamenme|llamame)\b/.test(t)) return { tipo: 'pedir_llamada' }
  if (
    /\bcomo\s+va\b[^.]{0,30}\b(orden|pedido|trabajo)\b/.test(t) ||
    /\b(estado|como\s+vamos?)\b[^.]{0,20}\b(orden|pedido)\b/.test(t) ||
    /\b(ver|consultar)\s+(mi|el|la)?\s*(orden|pedido)\b/.test(t)
  ) return { tipo: 'ver_pedido' }
  if (
    /\bcuenta\b/.test(t) &&
    /\b(manda|mandame|mandar|envia|enviame|enviar|pasame|dame|quiero|quisiera|necesito)\b/.test(t)
  ) return { tipo: 'enviar_cuenta' }
  if (/\b(papel\s+del\s+trabajo|control\s+de\s+trabajos)\b/.test(t)) return { tipo: 'enviar_control' }
  if (
    /\b(hazme|haceme)\s+(un|una)\s+pedido\b/.test(t) ||
    /\b(hacer|tomar|hagamos)\s+(un\s+)?(nuevo\s+)?pedido\b/.test(t) ||
    /\bvamos\s+a\s+hacer\s+(un\s+)?(nuevo\s+)?pedido\b/.test(t) ||
    /\b(nuevo|nueva)\s+(pedido|orden)\b/.test(t) ||
    /\b(crear|hacer|tomar|registrar)\s+(una\s+)?(orden|pedido)\b/.test(t) ||
    /\bnecesito\s+crear\b/.test(t) ||
    /\bhay\s+que\s+hacerle\b/.test(t) ||
    /\b(quiero|quisiera|necesito)\s+(pedir|hacer|tomar)\b/.test(t) ||
    /\b(quiero|quisiera|necesito)\s+(una|un)\s+\w+/.test(t)
  ) return { tipo: 'nuevo_pedido', texto }
  return null
}

function rutaDe(llamada: LlamadaHerramienta): Ruta {
  const numero = typeof llamada.entrada === 'string' && llamada.entrada !== '' ? llamada.entrada : undefined
  return { tipo: llamada.nombre as Ruta['tipo'], ...(numero ? { numero } : {}) }
}

const REGEX_NUMERO = /^\d{1,18}$/
const REGEX_TEXTO = /^[0-9A-Za-z-]{1,20}$/

/**
 * Valida una llamada del modelo contra el esquema (S3): la herramienta debe
 * existir, los argumentos deben tener exactamente las claves declaradas con
 * el tipo correcto (regex de dígitos incluida) y `clinica_id` no es parámetro
 * de ninguna herramienta, así que si aparece se rechaza. Invalid => se niega
 * sin tocar la base.
 */
export function validarLlamada(nombre: string, argumentos: unknown): { ok: true; entrada: unknown } | { ok: false } {
  const esquema = ESQUEMAS[nombre]
  if (!esquema) return { ok: false }
  if (ES_INTENCION.has(nombre)) {
    // Intención: todos los parámetros son opcionales, pero si llegan deben
    // ser exactos en nombre y tipo; nada de claves extra ni clinica_id.
    if (argumentos === null || argumentos === undefined) return { ok: true, entrada: null }
    if (typeof argumentos !== 'object' || Array.isArray(argumentos)) return { ok: false }
    const objeto = argumentos as Record<string, unknown>
    const claves = Object.keys(objeto)
    for (const clave of claves) {
      // Object.hasOwn y no esquema[clave]: con '__proto__' el acceso devuelve
      // Object.prototype (verdadero) y la clave se colaría sin validar el tipo.
      if (!Object.hasOwn(esquema, clave)) return { ok: false }
      const tipo = esquema[clave]
      const valor = objeto[clave]
      if (tipo === 'numero' && !(typeof valor === 'string' && REGEX_NUMERO.test(valor))) return { ok: false }
      if (tipo === 'texto' && !(typeof valor === 'string' && REGEX_TEXTO.test(valor))) return { ok: false }
    }
    return { ok: true, entrada: claves.length === 1 ? objeto[claves[0]!] : null }
  }
  if (argumentos === null || typeof argumentos !== 'object' || Array.isArray(argumentos)) {
    return esquema && Object.keys(esquema).length === 0 ? { ok: true, entrada: null } : { ok: false }
  }
  const objeto = argumentos as Record<string, unknown>
  const claves = Object.keys(objeto)
  const esperadas = Object.keys(esquema)
  if (claves.length !== esperadas.length) return { ok: false }
  for (const clave of claves) {
    if (!Object.hasOwn(esquema, clave)) return { ok: false } // clave extra, __proto__ o clinica_id
    const tipo = esquema[clave]
    const valor = objeto[clave]
    if (tipo === 'numero' && !(typeof valor === 'string' && REGEX_NUMERO.test(valor))) return { ok: false }
    if (tipo === 'texto' && !(typeof valor === 'string' && REGEX_TEXTO.test(valor))) return { ok: false }
  }
  const unica = esperadas.length === 1 ? objeto[esperadas[0]!] : null
  return { ok: true, entrada: esperadas.length === 0 ? null : unica }
}

/**
 * Redacción defensiva (IA3, punto 5): nunca debe salir al proveedor el
 * teléfono del contacto, un token de sesión, ni un DSN. Los patrones son
 * defensivos; los datos de negocio que el modelo sí puede ver (ids de orden,
 * estados, montos, servicios) son texto que el propio usuario escribió.
 */
export function redactar(texto: string): string {
  return texto
    .replace(/\+?\b57\d{10}\b/g, '[teléfono]') // número colombiano completo
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]') // JWT
    .replace(/\b(?:postgres(?:ql)?|redis|mysql|mongodb):\/\/\S+/gi, '[dsn]')
    .replace(/\bBearer\s+[\w.-]+/gi, '[token]')
}

type Mensaje =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: LlamadaGroq[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Definición de tool para el proveedor (formato OpenAI, que Groq respeta). */
function definicionHerramienta(nombre: string, esquema: Record<string, TipoParam>, descripcion: string) {
  const propiedades: Record<string, { type: string; description: string }> = {}
  for (const [clave, tipo] of Object.entries(esquema)) {
    propiedades[clave] = {
      type: 'string',
      description: tipo === 'numero' ? 'Identificador numérico, solo dígitos.' : 'Código corto alfanumérico.',
    }
  }
  return {
    type: 'function' as const,
    function: {
      name: nombre,
      description: descripcion,
      parameters: { type: 'object', properties: propiedades, additionalProperties: false },
    },
  }
}

export interface LlamadaGroq {
  id: string
  function: { name: string; arguments: string }
}

export interface UsoGroq {
  entrada: number
  salida: number
}

export type RespuestaGroq =
  | { texto: string; uso: UsoGroq }
  | { llamadas: LlamadaGroq[]; uso: UsoGroq }

/** Auditoría por llamada al modelo: intención, herramienta, tokens y desenlace. Nunca el cuerpo de los mensajes. */
export interface RegistroLlm {
  intencion: string
  herramienta: string | null
  tokensEntrada: number
  tokensSalida: number
  resultado: 'texto' | 'herramienta_ok' | 'negado' | 'fallo'
}

export type Auditador = (registro: RegistroLlm) => void

/** Consumo acumulado e historial de una conversación (IA3, punto 4). */
interface ConversacionLlm {
  historial: Array<{ role: 'user' | 'assistant'; content: string }>
  tokens: number
  expiresAt: number
}

export class StoreLlm {
  private readonly estados = new Map<string, ConversacionLlm>()

  constructor(
    private readonly ttlMs = 15 * 60 * 1000,
    private readonly maxEntradas = 2000,
  ) {}

  get size(): number {
    return this.estados.size
  }

  get(telefono: string, ahora = Date.now()): ConversacionLlm | undefined {
    const estado = this.estados.get(telefono)
    if (!estado) return undefined
    if (estado.expiresAt <= ahora) {
      this.estados.delete(telefono)
      return undefined
    }
    return { historial: estado.historial.map((m) => ({ ...m })), tokens: estado.tokens, expiresAt: estado.expiresAt }
  }

  set(telefono: string, estado: ConversacionLlm, ahora = Date.now()): void {
    for (const [id, v] of this.estados) if (v.expiresAt <= ahora) this.estados.delete(id)
    while (this.estados.size >= this.maxEntradas) {
      const masViejo = this.estados.keys().next().value
      if (masViejo === undefined) break
      this.estados.delete(masViejo)
    }
    this.estados.set(telefono, { historial: estado.historial.map((m) => ({ ...m })), tokens: estado.tokens, expiresAt: ahora + this.ttlMs })
  }

  clear(telefono: string): void {
    this.estados.delete(telefono)
  }
}

/** Mensaje cortés cuando el tope de costo se alcanzó. */
export const LIMITE_COSTO =
  'Hemos llegado al tope de mensajes de esta conversación, disculpa. Más tarde seguimos con gusto: escribe 0 y volvemos al menú.'

/** Mensaje cuando el modelo pidió algo fuera del catálogo o inválido: la misma negativa fija. */
export const NO_PUEDO = NEGATIVA_FIJA

/** Frase fija por clase de negativa (IA4). La de identidad lleva el nombre del bot. */
function textoNegativa(clase: ClaseNegativa, nombre: string): string {
  return clase === 'escritura' ? NEGATIVA_ESCRITURA
    : clase === 'suplantacion' ? NEGATIVA_SUPLANTACION
    : clase === 'identidad' ? negativaIdentidad(nombre)
    : clase === 'infraestructura' ? NEGATIVA_INFRAESTRUCTURA
    : NEGATIVA_FIJA
}

/** Mensaje cuando el modelo no dio respuesta utilizable en las rondas permitidas. */
const SIN_RESPUESTA = 'Ahora mismo no pude darte una respuesta, disculpa. Escribe 0 y seguimos paso a paso.'

function parseUso(cuerpo: unknown): UsoGroq {
  const uso = (cuerpo as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } })?.usage
  return {
    entrada: typeof uso?.prompt_tokens === 'number' ? uso.prompt_tokens : 0,
    salida: typeof uso?.completion_tokens === 'number' ? uso.completion_tokens : 0,
  }
}

/** Un turno de conversación completo: posible ida y vuelta al modelo (máx 2). */
export type RespuestaLlm =
  | { texto: string | null; ruta?: undefined } // texto null => fallback al menú
  | { texto?: undefined; ruta: Ruta }

export class ClienteGroq {
  constructor(
    private readonly config: ConfigLlm,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly auditar: Auditador = () => {},
  ) {}

  /** Una ronda contra Groq. Lanza en error de red; devuelve null si Groq no respondió bien. */
  async ronda(mensajes: Mensaje[]): Promise<RespuestaGroq | null> {
    const cuerpo = {
      model: this.config.modelo,
      messages: mensajes,
      tools: Object.entries(ESQUEMAS).map(([nombre, esquema]) =>
        definicionHerramienta(
          nombre,
          esquema,
          nombre === 'estado_orden' ? 'Estado, fechas, doctor y detalles de una orden por su número.'
            : nombre === 'ultima_orden_doctor' ? 'La orden más reciente del doctor.'
            : nombre === 'cuenta_de_cobro' ? 'Una cuenta de cobro por su número.'
            : nombre === 'listar_doctores' ? 'Doctores activos de la clínica.'
            : nombre === 'ver_pedido' ? 'La persona quiere saber cómo va un pedido o ver una orden. Sin número, el flujo lo pregunta.'
            : nombre === 'nuevo_pedido' ? 'La persona quiere tomar un pedido nuevo; el flujo lo toma paso a paso y confirma antes de crear.'
            : nombre === 'pedir_llamada' ? 'La persona pide que el laboratorio la llame.'
            : nombre === 'enviar_control' ? 'Enviar el control de trabajos de una orden en PDF. El número de orden es opcional.'
            : nombre === 'enviar_cuenta' ? 'Enviar una cuenta de cobro en PDF. El número es opcional.'
            : nombre === 'buscar_orden' ? 'La persona habla de una orden que ya existe: por el nombre del paciente, por el número, por los dos o por el día en que la hizo. El flujo la busca y contesta.'
            : nombre === 'editar_orden' ? 'La persona quiere quitar o agregar dientes, cambiar la cantidad o el color de una orden que ya existe. El flujo muestra antes y después y confirma antes de escribir.'
            : 'Catálogo de servicios activos.',
        ),
      ),
      tool_choice: 'auto',
    }
    let respuesta: globalThis.Response | null = null
    // Máximo un reintento, y solo ante error de red (fetch lanza).
    for (let intento = 0; intento < 2; intento++) {
      try {
        respuesta = await this.fetchFn(GROQ_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.apiKey}` },
          body: JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        })
        break
      } catch {
        if (intento === 1) return null
      }
    }
    if (!respuesta || !respuesta.ok) return null
    const datos = (await respuesta.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: LlamadaGroq[] } }>
    } | null
    const mensaje = datos?.choices?.[0]?.message
    if (!mensaje) return null
    const uso = parseUso(datos)
    if (Array.isArray(mensaje.tool_calls) && mensaje.tool_calls.length > 0) {
      return { llamadas: mensaje.tool_calls, uso }
    }
    if (typeof mensaje.content !== 'string' || mensaje.content.trim() === '') return null
    return { texto: mensaje.content, uso }
  }

  /**
   * Bucle acotado (máx MAX_RONDAS rondas): envía el mensaje, ejecuta las
   * herramientas válidas que pida y entrega los resultados al modelo. Toda
   * conversación queda con el historial recortado y el costo acumulado.
   * Devuelve el texto para el contacto, o null si Groq falló (fallback menú).
   */
  async manejar(
    telefono: string,
    texto: string,
    datos: DatosBot,
    clinicaId: string,
    store: StoreLlm,
    ahora = Date.now(),
    contexto?: { clinica?: string; doctor?: string },
  ): Promise<RespuestaLlm> {
    const previo = store.get(telefono, ahora) ?? { historial: [], tokens: 0, expiresAt: ahora }
    if (previo.tokens >= LIMITE_TOKENS) {
      store.set(telefono, previo, ahora)
      return { texto: LIMITE_COSTO }
    }
    const usuarioRedactado = redactar(texto)
    // Política de negativas en código (IA4, S3): se revisa ANTES de llamar al
    // modelo. Así la negativa no depende de que el modelo obedezca: cero
    // fetches, cero tokens, y el estado de la conversación queda intacto.
    const clase = clasificarNegativa(usuarioRedactado)
    if (clase !== null) {
      store.set(telefono, previo, ahora)
      this.auditar({ intencion: 'conversacion', herramienta: null, tokensEntrada: 0, tokensSalida: 0, resultado: 'negado' })
      return { texto: textoNegativa(clase, this.config.nombre) }
    }
    // Prechequeo de intención: ruta directa al flujo determinista sin una
    // sola llamada al modelo (sabotaje en vivo: el modelo no elegía la
    // herramienta para "hazme un pedido"). La política de negativas va
    // primero a propósito: una inyección nunca se aprovecha de la ruta.
    const rutaPrevia = prechequeoRuta(usuarioRedactado)
    if (rutaPrevia) {
      store.set(telefono, previo, ahora)
      this.auditar({ intencion: rutaPrevia.tipo, herramienta: rutaPrevia.tipo, tokensEntrada: 0, tokensSalida: 0, resultado: 'herramienta_ok' })
      return { ruta: rutaPrevia }
    }
    const historial = previo.historial.slice(-MAX_TURNOS_HISTORIAL * 2)
    const mensajes: Mensaje[] = [
      { role: 'system', content: construirPromptSistema(contexto, new Date(ahora)) },
      ...historial.map((m) => ({ role: m.role, content: m.content }) as Mensaje),
      { role: 'user', content: usuarioRedactado },
    ]
    let tokens = previo.tokens
    const historialNuevo: Array<{ role: 'user' | 'assistant'; content: string }> = [...historial]
    historialNuevo.push({ role: 'user', content: usuarioRedactado })
    for (let ronda = 0; ronda < MAX_RONDAS; ronda++) {
      let respuesta: RespuestaGroq | null
      try {
        respuesta = await this.ronda(mensajes)
      } catch {
        store.set(telefono, previo, ahora)
        return { texto: null }
      }
      if (!respuesta) {
        store.set(telefono, previo, ahora)
        return { texto: null }
      }
      tokens += respuesta.uso.entrada + respuesta.uso.salida
      if ('texto' in respuesta) {
        // IA7/S13: el modelo enruta; el texto libre suyo nunca es la puerta.
        // Sin acción nombrada en la primera ronda: saludo al llegar, una sola
        // pregunta de aclaración si ya hay conversación. Con datos ya
        // consultados (ronda mayor a 0), la respuesta del modelo sí se muestra.
        const textoFinal = ronda === 0 ? (previo.historial.length === 0 ? SALUDO : PREGUNTA_ACLARAR) : respuesta.texto
        historialNuevo.push({ role: 'assistant', content: textoFinal })
        store.set(telefono, { historial: historialNuevo.slice(-MAX_TURNOS_HISTORIAL * 2), tokens, expiresAt: ahora }, ahora)
        this.auditar({ intencion: 'conversacion', herramienta: null, tokensEntrada: respuesta.uso.entrada, tokensSalida: respuesta.uso.salida, resultado: 'texto' })
        return { texto: textoFinal }
      }
      // Validar TODAS las llamadas antes de ejecutar ninguna: una inválida
      // niega el turno completo sin tocar la base (IA3, punto 3).
      const validas: Array<{ llamada: LlamadaHerramienta; id: string }> = []
      let rechazada = false
      let nombrePrimera: string | null = null
      for (const cruda of respuesta.llamadas) {
        nombrePrimera ??= cruda.function?.name ?? null
        let argumentos: unknown = null
        try {
          argumentos = cruda.function?.arguments ? JSON.parse(cruda.function.arguments) : null
        } catch {
          rechazada = true
          break
        }
        const valida = validarLlamada(cruda.function?.name ?? '', argumentos)
        if (!valida.ok) {
          rechazada = true
          break
        }
        validas.push({ llamada: { nombre: cruda.function.name, entrada: valida.entrada }, id: cruda.id })
      }
      if (rechazada || validas.length === 0) {
        store.set(telefono, previo, ahora)
        this.auditar({ intencion: 'conversacion', herramienta: nombrePrimera, tokensEntrada: respuesta.uso.entrada, tokensSalida: respuesta.uso.salida, resultado: 'negado' })
        return { texto: NO_PUEDO }
      }
      // IA7/S13: una intención de enrutado cierra el turno sin tocar la base;
      // el flujo determinista (atenderRuta en flows.ts) es el ejecutor.
      const intencion = validas.find((v) => ES_INTENCION.has(v.llamada.nombre))
      if (intencion) {
        historialNuevo.push({ role: 'assistant', content: `[ruta ${intencion.llamada.nombre}]` })
        store.set(telefono, { historial: historialNuevo.slice(-MAX_TURNOS_HISTORIAL * 2), tokens, expiresAt: ahora }, ahora)
        this.auditar({ intencion: intencion.llamada.nombre, herramienta: intencion.llamada.nombre, tokensEntrada: respuesta.uso.entrada, tokensSalida: respuesta.uso.salida, resultado: 'herramienta_ok' })
        const ruta = rutaDe(intencion.llamada)
        if (ruta.tipo !== 'ver_pedido' && ruta.tipo !== 'enviar_control' && ruta.tipo !== 'enviar_cuenta' && ruta.tipo !== 'pedir_llamada') {
          ruta.texto = usuarioRedactado
        }
        return { ruta }
      }
      historialNuevo.push({ role: 'assistant', content: `[consultó ${nombrePrimera}]` })
      mensajes.push({ role: 'assistant', content: null, tool_calls: respuesta.llamadas })
      for (const { llamada, id } of validas) {
        const resultado = await ejecutarHerramienta(datos, clinicaId, llamada)
        // "No encontré" nunca vuelve al modelo (IA4): el modelo podría
        // inventar datos para llenar el vacío. La frase fija responde.
        if (!resultado.ok && resultado.texto === NO_ENCONTRADO) {
          store.set(telefono, { historial: historialNuevo.slice(-MAX_TURNOS_HISTORIAL * 2), tokens, expiresAt: ahora }, ahora)
          this.auditar({ intencion: 'conversacion', herramienta: nombrePrimera, tokensEntrada: respuesta.uso.entrada, tokensSalida: respuesta.uso.salida, resultado: 'negado' })
          return { texto: NEGATIVA_NO_ENCONTRADO }
        }
        mensajes.push({ role: 'tool', tool_call_id: id, content: JSON.stringify(resultado.ok ? resultado.filas : { error: resultado.texto }) })
      }
      this.auditar({ intencion: 'conversacion', herramienta: nombrePrimera, tokensEntrada: respuesta.uso.entrada, tokensSalida: respuesta.uso.salida, resultado: 'herramienta_ok' })
      if (tokens >= LIMITE_TOKENS) {
        store.set(telefono, { historial: historialNuevo.slice(-MAX_TURNOS_HISTORIAL * 2), tokens, expiresAt: ahora }, ahora)
        this.auditar({ intencion: 'conversacion', herramienta: nombrePrimera, tokensEntrada: respuesta.uso.entrada, tokensSalida: respuesta.uso.salida, resultado: 'fallo' })
        return { texto: LIMITE_COSTO }
      }
    }
    // Dos rondas y el modelo seguía pidiendo herramientas: se cierra en corto.
    store.set(telefono, previo, ahora)
    this.auditar({ intencion: 'conversacion', herramienta: null, tokensEntrada: 0, tokensSalida: 0, resultado: 'fallo' })
    return { texto: SIN_RESPUESTA }
  }
}

/** Texto cuando la capa de datos no está disponible y el LLM sí respondió. */
export const NO_DISPONIBLE_LLM = NO_DISPONIBLE
