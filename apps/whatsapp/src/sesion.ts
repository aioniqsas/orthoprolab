import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from '@whiskeysockets/baileys'

/** Instrucciones que ve el operador al emparejar (una por vía). */
export const INSTRUCCION_QR =
  'Escanea este código con el teléfono: WhatsApp > Dispositivos vinculados > Vincular un dispositivo.'
export const INSTRUCCION_CODIGO =
  'En el teléfono: WhatsApp > Dispositivos vinculados > Vincular con número de teléfono.'
export const MENSAJE_SESION_TERMINADA =
  'La sesión quedó cerrada (código 401): elimina el directorio de sesión y vuelve a iniciar el bot para emparejar de nuevo.'
export const MENSAJE_VERSION_FALLBACK =
  'No se pudo consultar la versión de WhatsApp Web; se usa la incluida en Baileys.'

export interface OpcionesSesion {
  crearSocket: typeof makeWASocket
  consultarVersion: typeof fetchLatestBaileysVersion
  auth: Parameters<typeof makeWASocket>[0]['auth']
  /** Dígitos E.164 sin `+` de WHATSAPP_PAIRING_PHONE; sin ella, vía QR. */
  telefonoVinculado?: string
  pedirCodigo: (numero: string) => Promise<string>
  mostrarQr: (qr: string) => void
  mostrarCodigo: (codigo: string) => void
  log: (linea: string) => void
}

/**
 * Crea el socket pidiendo primero la versión vigente de WhatsApp Web (defecto
 * de conexión terminada tras el registro) y conecta la vía de emparejamiento:
 * QR en la terminal, o código de 8 caracteres si hay teléfono de emparejamiento.
 */
export async function iniciarSesion(op: OpcionesSesion): Promise<WASocket> {
  let version: [number, number, number] | undefined
  try {
    const resultado = await op.consultarVersion()
    version = resultado.version
    op.log(`Versión de WhatsApp Web: ${version.join('.')}`)
  } catch {
    op.log(MENSAJE_VERSION_FALLBACK)
  }
  const socket = op.crearSocket({ auth: op.auth, version, printQRInTerminal: false })
  let codigoPedido = false
  socket.ev.on('connection.update', async (datos: { qr?: string }) => {
    const { qr } = datos
    if (!qr) return
    if (op.telefonoVinculado !== undefined) {
      if (codigoPedido) return
      codigoPedido = true
      op.mostrarCodigo(await op.pedirCodigo(op.telefonoVinculado))
      return
    }
    op.mostrarQr(qr)
  })
  return socket
}

/** Muestra el código de 8 caracteres con su instrucción. */
export function mostrarCodigoEmparejamiento(
  codigo: string,
  imprimir: (linea: string) => void,
): void {
  imprimir(`Código de emparejamiento: ${codigo}`)
  imprimir(INSTRUCCION_CODIGO)
}

/**
 * WHATSAPP_PAIRING_PHONE: dígitos E.164 sin `+`. Devuelve los dígitos o
 * undefined si el valor es inválido (el llamante decide salir).
 */
export function telefonoEmparejamiento(valor: string | undefined): string | undefined {
  if (!valor) return undefined
  const digitos = valor.trim().replace(/^\+/, '')
  return /^\d{8,15}$/.test(digitos) ? digitos : undefined
}

/** 401 = cerró sesión: la reconnexión nunca la recupera. */
export function esSesionTerminada(codigo: number | undefined): boolean {
  return codigo === DisconnectReason.loggedOut
}

/**
 * Decisión ante un cierre de conexión: 401 es terminal (no quemar los 8
 * intentos); cualquier otro código reintenta hasta el máximo.
 */
export function planDesconexion(
  codigo: number | undefined,
  intento: number,
  maximo: number,
  delaySegundos: number,
): { accion: 'salir' | 'reintentar'; mensaje: string } {
  if (esSesionTerminada(codigo)) return { accion: 'salir', mensaje: MENSAJE_SESION_TERMINADA }
  if (intento >= maximo) {
    return {
      accion: 'salir',
      mensaje: `Reconexión fallida tras ${maximo} intentos. Revisa la red y vuelve a iniciar el bot.`,
    }
  }
  return {
    accion: 'reintentar',
    mensaje: `Desconectado (código ${codigo ?? 'desconocido'}); reintentando en ${delaySegundos} s (intento ${intento + 1} de ${maximo}).`,
  }
}
