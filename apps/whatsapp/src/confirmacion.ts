/**
 * Puerta de confirmación en código (S4, T3): crear o editar una orden exige
 * que la persona haya confirmado el resumen en un turno previo. Estado
 * explícito y verificable, no una instrucción del prompt. Sin confirmación
 * previa, la herramienta de escritura no se ejecuta y el bot pide confirmar.
 */

export type TipoEscritura = 'crear_orden' | 'editar_orden'

export type ConfirmacionPendiente = {
  tipo: TipoEscritura
  /** Resumen que se le mostró a la persona para confirmar. */
  resumen: string
  /** Datos necesarios para ejecutar la escritura una vez confirmada. */
  datos: Record<string, unknown>
  confirmado: boolean
  expiresAt: number
}

export const TTL_CONFIRMACION_MS = 15 * 60 * 1000

/** Mensaje cuando se intenta escribir sin confirmación previa. */
export const CONFIRMACION_REQUERIDA =
  'Antes de continuar necesito tu confirmación. Revisa el resumen y responde "sí" para confirmar o "no" para cancelar.'

/** Confirmación literal/tolerante del usuario. */
export const ES_CONFIRMACION_SI = /^(1|sí|si|confirmar)$/i
export const ES_CONFIRMACION_NO = /^(0|no|cancelar)$/i

export class PuertaConfirmacion {
  private readonly pendientes = new Map<string, ConfirmacionPendiente>()

  constructor(private readonly ttlMs = TTL_CONFIRMACION_MS) {}

  /** Registra un resumen pendiente de confirmación (aún no confirmado). */
  proponer(telefono: string, tipo: TipoEscritura, resumen: string, datos: Record<string, unknown>, ahora = Date.now()): void {
    this.pendientes.set(telefono, { tipo, resumen, datos, confirmado: false, expiresAt: ahora + this.ttlMs })
  }

  /** Devuelve la confirmación pendiente vigente, si existe. */
  pendiente(telefono: string, ahora = Date.now()): ConfirmacionPendiente | undefined {
    const p = this.pendientes.get(telefono)
    if (!p) return undefined
    if (p.expiresAt <= ahora) {
      this.pendientes.delete(telefono)
      return undefined
    }
    return { ...p, datos: { ...p.datos } }
  }

  /**
   * Registra la confirmación del usuario para el turno previo: si hay una
   * propuesta pendiente y el texto es un "sí", queda marcada como confirmada.
   */
  confirmar(telefono: string, texto: string, ahora = Date.now()): ConfirmacionPendiente | undefined {
    const p = this.pendiente(telefono, ahora)
    if (!p) return undefined
    if (ES_CONFIRMACION_NO.test(texto.trim())) {
      this.pendientes.delete(telefono)
      return undefined
    }
    if (ES_CONFIRMACION_SI.test(texto.trim())) {
      const confirmado = { ...p, confirmado: true, expiresAt: ahora + this.ttlMs }
      this.pendientes.set(telefono, confirmado)
      return confirmado
    }
    return undefined
  }

  /** ¿Hay confirmación previa verificada para una escritura de este tipo? */
  confirmada(telefono: string, tipo: TipoEscritura, ahora = Date.now()): ConfirmacionPendiente | undefined {
    const p = this.pendiente(telefono, ahora)
    if (!p || p.tipo !== tipo || !p.confirmado) return undefined
    return p
  }

  /** Consume (elimina) la confirmación tras ejecutar o cancelar la escritura. */
  consumir(telefono: string): void {
    this.pendientes.delete(telefono)
  }

  limpiar(telefono: string): void {
    this.pendientes.delete(telefono)
  }
}
