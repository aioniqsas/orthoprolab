/**
 * Logger para Baileys. El de fábrica (pino) imprime una línea JSON enorme por
 * cada paso interno, y entre ellas se pierden los mensajes del bot (QR, código,
 * "WhatsApp conectado"). Este deja pasar solo avisos y errores, en una línea
 * legible y sin volcar objetos. WHATSAPP_LOG_DETALLE=1 devuelve el de fábrica,
 * para depurar con todo el detalle.
 */

export interface LoggerBaileys {
  level: string
  child(obj: Record<string, unknown>): LoggerBaileys
  trace(obj: unknown, msg?: string): void
  debug(obj: unknown, msg?: string): void
  info(obj: unknown, msg?: string): void
  warn(obj: unknown, msg?: string): void
  error(obj: unknown, msg?: string): void
}

const MAX_CARACTERES = 200

/** Texto corto de lo que Baileys reporta: el mensaje, o el mensaje del error; nunca el objeto. */
export function resumirAviso(obj: unknown, msg?: string): string {
  const deError =
    typeof obj === 'object' && obj !== null
      ? ((obj as { err?: { message?: unknown } }).err?.message ?? (obj as { message?: unknown }).message)
      : undefined
  const crudo = msg ?? (typeof obj === 'string' ? obj : typeof deError === 'string' ? deError : 'sin detalle')
  const texto = typeof deError === 'string' && msg ? `${msg}: ${deError}` : crudo
  return texto.length > MAX_CARACTERES ? `${texto.slice(0, MAX_CARACTERES)}…` : texto
}

export function crearLoggerSencillo(imprimir: (linea: string) => void = console.log): LoggerBaileys {
  const callar = (): void => undefined
  const logger: LoggerBaileys = {
    level: 'warn',
    child: () => logger,
    trace: callar,
    debug: callar,
    info: callar,
    warn: (obj, msg) => imprimir(`[whatsapp] aviso: ${resumirAviso(obj, msg)}`),
    error: (obj, msg) => imprimir(`[whatsapp] error: ${resumirAviso(obj, msg)}`),
  }
  return logger
}

/** undefined = el logger de fábrica de Baileys. */
export function loggerDesdeEntorno(
  env: Record<string, string | undefined> = process.env,
): LoggerBaileys | undefined {
  return env.WHATSAPP_LOG_DETALLE === '1' ? undefined : crearLoggerSencillo()
}
