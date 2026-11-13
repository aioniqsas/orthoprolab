import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WAMessage,
} from '@whiskeysockets/baileys'
import qrcodeTerminal from 'qrcode-terminal'
import { chmod, mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { crearCliente, NO_HABILITADO, type ApiClient } from './api'
import { configuracionDesdeEntorno, DatosBot } from './datos'
import { ClienteGroq, configuracionLlm, FALLO_MODELO, StoreLlm, type RespuestaLlm } from './llm'
import { clasificarNegativa, negativaIdentidad, NEGATIVA_ESCRITURA, NEGATIVA_FIJA, NEGATIVA_INFRAESTRUCTURA, NEGATIVA_SUPLANTACION } from './prompt'
import { redactar } from './llm'
import { crearClienteRedis, MemoriaConversacion } from './memoria'
import { ReadFlows, type Respuesta } from './flows'
import { MENSAJE_LIMITE, RateLimiter } from './rate-limit'
import { ConversationStore } from './estado'
import { OrderFlows } from './write-flows'
import { canjearVinculacion, parseVincular, VINCULAR_FALLO, VINCULAR_OK, VINCULAR_YA } from './vinculacion'
import { resolveIdentity } from './identity'
import { telefonoDelRemitente } from './lid'
import { esperarEscribiendo, pausaAntesDeResponder, textoDeRespuesta } from './ritmo'
import {
  INSTRUCCION_QR,
  iniciarSesion,
  mostrarCodigoEmparejamiento,
  planDesconexion,
  telefonoEmparejamiento,
} from './sesion'
import {
  assertAuthDirOutsideRepo,
  detectRepoRoot,
  etiquetaRemitente,
  motivoDescarte,
  reconnectDelayMs,
  RECONNECT_MAX_ATTEMPTS,
  senderTagHash,
  AUTH_DIR_MODE,
  AUTH_FILE_MODE,
} from './safety'

// WHATSAPP_AUTH_DIR configures external Baileys credentials; never put it in this repo.
const authDir = process.env.WHATSAPP_AUTH_DIR ?? join(homedir(), '.orthopro-lab', 'whatsapp', 'auth_info')
// El número del remitente se ve en el log mientras se depura; fuera de eso, solo su hash.
const MOSTRAR_NUMEROS = process.env.WHATSAPP_LOG_NUMEROS === '1' || process.env.NODE_ENV !== 'production'
const conversations = new ConversationStore()
// Límite por número (T7): un puñado de interacciones por minuto. Siempre se
// aplica después de shouldIgnoreSender, nunca antes: los chats ignorados no
// reciben respuesta de límite.
// Env vars leídas en la construcción, nunca al importar: si falta alguna el
// bot responde "no está configurado" en vez de crashear (API_BASE_URL,
// WHATSAPP_SERVICE_TOKEN, WHATSAPP_HMAC_SECRET).
const api: ApiClient = crearCliente()
const limites = new RateLimiter()
const flows = new ReadFlows(conversations, api, new OrderFlows(conversations, api), limites)

// IA3 (S4): el LLM es opcional y el menú determinista sigue siendo la base.
// Sin GROQ_API_KEY, con WHATSAPP_LLM_ENABLED=false o con Groq caído, todo
// pasa por ReadFlows exactamente como antes.
const configLlm = configuracionLlm()
const datosBot = new DatosBot(configuracionDesdeEntorno())
const flujoLlm = configLlm ? new ClienteGroq(configLlm) : null
const redisMemoria = crearClienteRedis()
const memoria = new MemoriaConversacion(redisMemoria)
const storeLlm = new StoreLlm(undefined, undefined, memoria)
// Escape determinístico y barato (T4 corrección): reinicia la conversación sin
// llamar al modelo y limpia estado/confirmaciones pendientes.
const ES_ESCAPE = /^(?:0|cancelar|men[úu]|volver|inicio)$/i
const REINICIO = 'Listo, empecé de nuevo. ¿En qué te puedo ayudar?'

// Vía de emparejamiento: QR en la terminal o código de 8 caracteres si se
// define WHATSAPP_PAIRING_PHONE (defecto del `console.log(qr)` crudo).
const telefonoEmparejado = telefonoEmparejamiento(process.env.WHATSAPP_PAIRING_PHONE)
const mostrarQr = (qr: string): void => {
  console.log(INSTRUCCION_QR)
  qrcodeTerminal.generate(qr, { small: true })
}
const mostrarCodigo = (codigo: string): void => mostrarCodigoEmparejamiento(codigo, console.log)

function textoNegativa(clase: ReturnType<typeof clasificarNegativa>, nombre: string): string {
  return clase === 'escritura' ? NEGATIVA_ESCRITURA
    : clase === 'suplantacion' ? NEGATIVA_SUPLANTACION
    : clase === 'identidad' ? negativaIdentidad(nombre)
    : clase === 'infraestructura' ? NEGATIVA_INFRAESTRUCTURA
    : NEGATIVA_FIJA
}

/**
 * Entrada de texto al modelo (T3): S3 negativas antes del modelo; S5 mensaje
 * fijo si el modelo no está disponible o falla. Nunca cae a flujos ni a menú.
 */
async function respuestaAgente(
  telefono: string,
  texto: string,
  clinicaId: string,
): Promise<RespuestaLlm> {
  const clase = clasificarNegativa(redactar(texto))
  if (clase !== null) {
    const nombre = configLlm?.nombre ?? 'Aioniq'
    return { texto: textoNegativa(clase, nombre) }
  }
  if (!flujoLlm || !configLlm) return { texto: FALLO_MODELO }
  // IA8: el nombre del bot viene de la base (cacheado en DatosBot) y alimenta
  // tanto el prompt como la negativa de identidad; falla => 'Aioniq'.
  configLlm.nombre = await datosBot.nombreBot(clinicaId)
  const r = await flujoLlm.manejar(telefono, texto, datosBot, clinicaId, storeLlm)
  if (r.texto === null) return { texto: FALLO_MODELO }
  return r
}

/** Create the auth dir with owner-only permissions and chmod every credential file to 0600. */
async function secureAuthDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: AUTH_DIR_MODE })
  await chmod(dir, AUTH_DIR_MODE)
  const names = await readdir(dir).catch(() => [])
  await Promise.all(names.map((name) => chmod(join(dir, name), AUTH_FILE_MODE).catch(() => {})))
}

/** saveCreds wrapper that re-tightens permissions after every Baileys write. */
async function saveCredsSecured(saveCreds: () => Promise<void>, dir: string): Promise<void> {
  await saveCreds()
  await secureAuthDir(dir)
}

function messageType(message: WAMessage): string {
  if (message.message?.conversation || message.message?.extendedTextMessage) return 'text'
  return 'other'
}

function messageText(message: WAMessage): string {
  return message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? ''
}

async function start(attempt = 1): Promise<void> {
  await secureAuthDir(authDir)
  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  let sockRef: Awaited<ReturnType<typeof makeWASocket>> | undefined
  const socket = await iniciarSesion({
    crearSocket: makeWASocket,
    consultarVersion: fetchLatestBaileysVersion,
    auth: state,
    telefonoVinculado: telefonoEmparejado,
    pedirCodigo: (numero) => {
      if (!sockRef) throw new Error('socket no listo')
      return sockRef.requestPairingCode(numero)
    },
    mostrarQr,
    mostrarCodigo,
    log: console.log,
  })
  sockRef = socket
  // Baileys 7 guarda el mapeo LID → teléfono; no siempre está disponible.
  const lidMapping = (
    socket.signalRepository as unknown as {
      lidMapping?: { getPNForLID?: (jid: string) => Promise<string | null | undefined> }
    }
  ).lidMapping

  /** Responde con ritmo humano: primero "escribiendo…", después el mensaje. */
  const responder = async (jid: string, contenido: Parameters<typeof socket.sendMessage>[1]) => {
    const texto = textoDeRespuesta(contenido as { text?: string; caption?: string })
    const pausa = pausaAntesDeResponder(texto)
    if (pausa > 0) {
      console.log(`Escribiendo ${(pausa / 1000).toFixed(1)} s (${texto.length} caracteres)`)
      await esperarEscribiendo(pausa, async (estado) => {
        await socket.sendPresenceUpdate(estado, jid).catch(() => undefined)
      })
    }
    return socket.sendMessage(jid, contenido)
  }

  /** Envía la respuesta y registra el intercambio en la memoria (S1). */
  const registrarYResponder = async (
    jid: string,
    telefonoMemoria: string,
    textoUsuario: string,
    respuesta: Respuesta | { kind: 'text'; text: string },
  ): Promise<void> => {
    await memoria.registrarIntercambio(telefonoMemoria, textoUsuario, respuesta.text)
    if (respuesta.kind === 'document') {
      await responder(jid, {
        document: respuesta.buffer,
        mimetype: 'application/pdf',
        fileName: respuesta.filename,
        caption: respuesta.text,
      })
    } else {
      await responder(jid, { text: respuesta.text })
    }
  }

  socket.ev.on('creds.update', () => void saveCredsSecured(saveCreds, authDir))
  socket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
      const plan = planDesconexion(code, attempt, RECONNECT_MAX_ATTEMPTS, reconnectDelayMs(attempt) / 1000)
      console.error(plan.mensaje)
      if (plan.accion === 'salir') process.exit(1)
      setTimeout(() => void start(attempt + 1), reconnectDelayMs(attempt))
    }
    if (connection === 'open' && socket.user?.id) {
      console.log(`WhatsApp conectado como ${etiquetaRemitente(socket.user.id, true)}.`)
    }
  })

  socket.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      const senderId = message.key.remoteJid ?? undefined
      const desde = senderId ? etiquetaRemitente(senderId, MOSTRAR_NUMEROS) : '(sin remitente)'
      // Solo chats 1:1 con el número del bot: nada de grupos ni difusiones.
      const descarte = motivoDescarte(senderId, message.key.fromMe === true)
      if (descarte || !senderId) {
        console.log(`Mensaje descartado (${descarte ?? 'sin remitente'}) de ${desde}`)
        continue
      }
      // El teléfono manda, no el JID: la lista de autorizados guarda números y
      // WhatsApp identifica cuentas nuevas con un LID.
      const remitente = await telefonoDelRemitente(
        senderId,
        (message.key as { remoteJidAlt?: string | null }).remoteJidAlt,
        async (jid) => (await lidMapping?.getPNForLID?.(jid)) ?? null,
      )
      if (!remitente) {
        console.log(`Mensaje descartado (lid sin traducir) de ${desde}`)
        await memoria.registrarIntercambio(senderId, '[sin número]', NO_HABILITADO)
        await responder(senderId, { text: NO_HABILITADO })
        continue
      }
      const quien = senderId.endsWith('@s.whatsapp.net')
        ? desde
        : `${etiquetaRemitente(remitente, MOSTRAR_NUMEROS)} (lid ${senderId.split('@')[0]})`
      if (!limites.interaccion(remitente, Date.now())) {
        await memoria.registrarIntercambio(remitente, messageText(message) || '[medio]', MENSAJE_LIMITE)
        await responder(senderId, { text: MENSAJE_LIMITE })
        continue
      }
      const type = messageType(message)
      const state = conversations.get(senderId)
      console.log(`Te escribieron desde ${quien} (${type}, paso ${state?.step ?? 'menu'})`)
      const faltante = api.mensajeConfigFaltante()
      if (faltante) {
        await memoria.registrarIntercambio(remitente, messageText(message) || '[medio]', faltante)
        await responder(senderId, { text: faltante })
        continue
      }
      // VINCULAR <código> (T8): antes del filtro de identidad, porque justamente
      // un número no vinculado es el que puede canjear el código.
      const codigoVincular = messageText(message) === '' ? null : parseVincular(messageText(message))
      if (codigoVincular) {
        // Un contacto ya verificado no canjea: el código se quemaría sin efecto
        // y la respuesta genérica confundiría. Se responde antes de canjear.
        const previa = await resolveIdentity(remitente, api)
        if (previa.ok) {
          await memoria.registrarIntercambio(remitente, messageText(message), VINCULAR_YA)
          await responder(senderId, { text: VINCULAR_YA })
          continue
        }
        const vinculado = await canjearVinculacion(api, remitente, codigoVincular)
        const textoVinc = vinculado ? VINCULAR_OK : VINCULAR_FALLO
        await memoria.registrarIntercambio(remitente, messageText(message), textoVinc)
        await responder(senderId, { text: textoVinc })
        continue
      }
      const identidad = await resolveIdentity(remitente, api)
      if (!identidad.ok) {
        // Misma respuesta corta para no registrado y bloqueado (S1).
        await memoria.registrarIntercambio(remitente, messageText(message) || '[medio]', identidad.reply)
        await responder(senderId, { text: identidad.reply })
        continue
      }
      // Medios no legibles (S11/T12): el modelo solo recibe texto; los medios
      // se responden con un aviso y la pregunta del paso en curso.
      if (type !== 'text') {
        const esAudio = Boolean(message.message?.audioMessage)
        const media = await flows.media(identidad.telefono, esAudio)
        await memoria.registrarIntercambio(identidad.telefono, esAudio ? '[audio]' : '[medio]', media.text)
        await responder(senderId, { text: media.text })
        continue
      }
      const textoMensaje = messageText(message)
      // Escape determinístico: no llama al modelo; limpia estado y confirmación.
      if (ES_ESCAPE.test(textoMensaje.trim())) {
        conversations.clear(identidad.telefono)
        await storeLlm.clear(identidad.telefono)
        flows.limpiar(identidad.telefono)
        await memoria.registrarIntercambio(identidad.telefono, textoMensaje, REINICIO)
        await responder(senderId, { text: REINICIO })
        continue
      }
      // T3: el mensaje de texto va directo al modelo (sin prechequeo, sin
      // flows.handle en el camino normal). S5: si el modelo falla/no está
      // configurado, texto fijo de reintento; nunca menú ni flujos.
      const ia = await respuestaAgente(
        identidad.telefono,
        textoMensaje,
        identidad.identidad.clinicId,
      )
      if (ia.ruta !== undefined) {
        const respuesta = await flows.atenderRuta(
          identidad.telefono,
          ia.ruta,
          identidad.identidad.doctorId,
        )
        await registrarYResponder(senderId, identidad.telefono, textoMensaje, respuesta)
        continue
      }
      const textoRespuesta = ia.texto ?? FALLO_MODELO
      await memoria.registrarIntercambio(identidad.telefono, textoMensaje, textoRespuesta)
      await responder(senderId, { text: textoRespuesta })
    }
  })
}

const guard = assertAuthDirOutsideRepo(authDir, detectRepoRoot(process.cwd()))
if (!guard.ok) {
  console.error(`${guard.reason}\nWHATSAPP_AUTH_DIR=${authDir}`)
  process.exit(1)
}

if (process.env.WHATSAPP_PAIRING_PHONE !== undefined && telefonoEmparejado === undefined) {
  console.error('WHATSAPP_PAIRING_PHONE inválido: usa dígitos E.164 sin + (ej. 573001234567).')
  process.exit(1)
}

void start().catch(() => {
  console.error('No fue posible iniciar el bot de WhatsApp.')
  process.exitCode = 1
})
