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
import { ClienteGroq, configuracionLlm, StoreLlm, type RespuestaLlm } from './llm'
import { ReadFlows, type Respuesta } from './flows'
import { buildMenu } from './menu'
import { MENSAJE_LIMITE, RateLimiter } from './rate-limit'
import { ConversationStore } from './state'
import { OrderFlows } from './write-flows'
import { canjearVinculacion, parseVincular, VINCULAR_FALLO, VINCULAR_OK, VINCULAR_YA } from './vinculacion'
import { resolveIdentity } from './identity'
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
const storeLlm = new StoreLlm()
// Escape con palabras naturales (IA7): nunca llega al modelo; el flujo
// determinista responde con el saludo sin gastar tokens.
const ES_ESCAPE = /^(?:0|cancelar|menú|menu|volver|inicio)$/i

// Vía de emparejamiento: QR en la terminal o código de 8 caracteres si se
// define WHATSAPP_PAIRING_PHONE (defecto del `console.log(qr)` crudo).
const telefonoEmparejado = telefonoEmparejamiento(process.env.WHATSAPP_PAIRING_PHONE)
const mostrarQr = (qr: string): void => {
  console.log(INSTRUCCION_QR)
  qrcodeTerminal.generate(qr, { small: true })
}
const mostrarCodigo = (codigo: string): void => mostrarCodigoEmparejamiento(codigo, console.log)

/**
 * Ruta o texto del modelo (IA7/S13); null si el modelo no está disponible y
 * toca el flujo determinista del menú como red de seguridad.
 */
async function respuestaLlm(
  telefono: string,
  texto: string,
  clinicaId: string,
): Promise<RespuestaLlm> {
  if (!flujoLlm || !configLlm) return { texto: null }
  // IA8: el nombre del bot viene de la base (cacheado en DatosBot) y alimenta
  // tanto el prompt como la negativa de identidad; falla => 'Aioniq'.
  configLlm.nombre = await datosBot.nombreBot(clinicaId)
  return await flujoLlm.manejar(telefono, texto, datosBot, clinicaId, storeLlm)
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
      if (!limites.interaccion(senderId, Date.now())) {
        await socket.sendMessage(senderId, { text: MENSAJE_LIMITE })
        continue
      }
      const type = messageType(message)
      const state = conversations.get(senderId)
      console.log(`Te escribieron desde ${desde} (${type}, paso ${state?.step ?? 'menu'})`)
      const faltante = api.mensajeConfigFaltante()
      if (faltante) {
        await socket.sendMessage(senderId, { text: faltante })
        continue
      }
      // VINCULAR <código> (T8): antes del filtro de identidad, porque justamente
      // un número no vinculado es el que puede canjear el código.
      const codigoVincular = messageText(message) === '' ? null : parseVincular(messageText(message))
      if (codigoVincular) {
        // Un contacto ya verificado no canjea: el código se quemaría sin efecto
        // y la respuesta genérica confundiría. Se responde antes de canjear.
        const previa = await resolveIdentity(senderId, api)
        if (previa.ok) {
          await socket.sendMessage(senderId, { text: VINCULAR_YA })
          continue
        }
        const vinculado = await canjearVinculacion(api, senderId, codigoVincular)
        await socket.sendMessage(senderId, { text: vinculado ? VINCULAR_OK : VINCULAR_FALLO })
        continue
      }
      const identidad = await resolveIdentity(senderId, api)
      if (!identidad.ok) {
        // Misma respuesta corta para no registrado y bloqueado (S1).
        await socket.sendMessage(senderId, { text: identidad.reply })
        continue
      }
      // Medios no legibles (S11/T12): audio y el resto reciben su aviso y la
      // pregunta del paso en curso, nunca el menú ni un salto de flujo.
      if (type !== 'text') {
        const esAudio = Boolean(message.message?.audioMessage)
        const media = await flows.media(identidad.telefono, esAudio)
        await socket.sendMessage(senderId, { text: media.text })
        continue
      }
      // IA7/S13: en el paso de saludo TODO el texto libre lo enruta el modelo
      // ("1", "la A", "quiero ver mi pedido", "mándame la cuenta"). Solo el
      // escape con palabras naturales va derecho al flujo determinista. Sin
      // modelo, o si el modelo no respondió, el menú numerado es la red de
      // seguridad: el bot nunca queda mudo.
      const textoMensaje = messageText(message)
      const pasoActual = conversations.get(identidad.telefono)?.step ?? 'menu'
      if (
        flujoLlm &&
        pasoActual === 'menu' &&
        textoMensaje.trim() !== '' &&
        !ES_ESCAPE.test(textoMensaje.trim())
      ) {
        const ia = await respuestaLlm(
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
          if (respuesta.kind === 'document') {
            await socket.sendMessage(senderId, {
              document: respuesta.buffer,
              mimetype: 'application/pdf',
              fileName: respuesta.filename,
              caption: respuesta.text,
            })
          } else {
            await socket.sendMessage(senderId, { text: respuesta.text })
          }
          continue
        }
        if (ia.texto !== null) {
          await socket.sendMessage(senderId, { text: ia.texto })
          continue
        }
      }
      const respuesta: Respuesta = await flows.handle(
        identidad.telefono,
        messageText(message),
        identidad.identidad.doctorId,
      )
      if (respuesta.kind === 'document') {
        await socket.sendMessage(senderId, {
          document: respuesta.buffer,
          mimetype: 'application/pdf',
          fileName: respuesta.filename,
          caption: respuesta.text,
        })
      } else {
        await socket.sendMessage(senderId, { text: respuesta.text })
      }
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
