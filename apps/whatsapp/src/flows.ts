import type { ApiClient, OrdenApi } from './api.js'
import { ApiError, UrlRechazadaError } from './api.js'
import { buildMenu } from './menu.js'
import { MENSAJE_LIMITE_LLAMADA, RateLimiter } from './rate-limit.js'
import type { ConversationStore } from './state.js'
import type { OrderFlows } from './write-flows.js'

/**
 * Flujos de lectura del menú (T5): estado de pedido (1), control de trabajos
 * (2, PDF) y cuenta de cobro (3, PDF). Cada paso es cancelable ("0" o
 * "cancelar") y vive en ConversationStore con su TTL. La clínica siempre sale
 * del contacto verificado, jamás del texto (S3, S4).
 */

export type Respuesta =
  | { kind: 'text'; text: string; intencion?: string; paso?: string }
  | { kind: 'document'; text: string; filename: string; buffer: Buffer; intencion?: string; paso?: string }

/** Copia honesta de la opción 0 (T7): nunca promete una llamada que no se registró. */
export const LLAMADA_OK = 'Listo. Registramos tu solicitud: el laboratorio te llamaremos a este número.'
export const LLAMADA_FALLO =
  'No pude registrar tu solicitud de llamada ahora mismo. Contacta al laboratorio directamente por el portal o por teléfono.'

/** Intención de auditoría (S8) derivada del paso previo, sin el texto del mensaje. */
export function intencionDe(step: string, texto: string): string {
  if (step === 'menu' && texto.trim() === '0') return 'llamada'
  if (step === 'pedido-numero') return 'estado'
  if (step === 'control-numero') return 'control'
  if (step === 'cuenta-numero') return 'cuenta'
  if (step.startsWith('orden-')) return 'orden_creada'
  return 'menu'
}

export const PEDIDO_NO_ENCONTRADO =
  'No encontré esa orden en tu clínica. Verifica el número y vuelve a intentarlo, o escribe 0 para volver al menú.'
export const CUENTA_NO_ENCONTRADA =
  'No encontré esa cuenta de cobro. Verifica el número y vuelve a intentarlo, o escribe 0 para volver al menú.'

const OPCION_CANCELAR = /^(0|cancelar)$/i

function esNumero(texto: string): boolean {
  return /^\d{1,9}$/.test(texto.trim())
}

/**
 * Nombre de archivo seguro (T5, ronda adversarial): solo [A-Za-z0-9._-], sin
 * separadores de ruta ni saltos de línea, con tope de longitud; si nada es
 * utilizable, cae al id numérico entregado por el propio flujo.
 */
export function nombreArchivoSeguro(valor: string, fallback: string): string {
  const limpio = valor.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40)
  return limpio === '' ? fallback : limpio
}

function fecha(fechaIso: string | null | undefined): string {
  if (!fechaIso) return 'Por definir'
  const dia = fechaIso.slice(0, 10)
  return dia === '' ? 'Por definir' : dia
}

function nombreDoctor(orden: OrdenApi): string {
  const doctor = orden.asignacion?.doctor
  if (!doctor) return 'Por asignar'
  return [doctor.nombres, doctor.apellidos].filter(Boolean).join(' ') || 'Por asignar'
}

/** Resumen legible en teléfono: líneas cortas, sin ids ni JSON. */
export function formatoOrden(orden: OrdenApi): string {
  const lineas = [
    `Orden ${orden.id}`,
    `Estado: ${orden.estado?.nombre ?? 'Desconocido'}`,
    `Entrega: ${fecha(orden.fechaEntrega)}`,
    `Doctor: ${nombreDoctor(orden)}`,
    `Paciente: ${orden.asignacion?.paciente?.nombre ?? 'Por definir'}`,
  ]
  for (const detalle of orden.detalles ?? []) {
    const dientes = (detalle.dientes ?? []).length > 0 ? ` (dientes ${detalle.dientes.join(' ')})` : ''
    const color = detalle.colorDiente ? `, color ${detalle.colorDiente}` : ''
    lineas.push(`- ${detalle.servicio} × ${detalle.cantidad}${dientes}${color}`)
  }
  return lineas.join('\n')
}

export class ReadFlows {
  constructor(
    private readonly store: ConversationStore,
    private readonly api: ApiClient,
    private readonly escritor?: OrderFlows,
    private readonly limites: RateLimiter = new RateLimiter(),
  ) {}

  /** Un turno de conversación para un contacto ya identificado. */
  async handle(telefono: string, texto: string, doctorContacto?: string): Promise<Respuesta> {
    const estado = this.store.get(telefono)
    const paso = estado?.step ?? 'menu'
    const respuesta = await this.handleInterno(telefono, texto, doctorContacto)
    // Auditoría de intención (S8): etiqueta derivada del paso, sin el cuerpo
    // del mensaje ni nombres. Falla en silencio; nunca retrasa la respuesta.
    if (respuesta.intencion === undefined) {
      respuesta.intencion = intencionDe(paso, texto)
      respuesta.paso = paso
    }
    void this.api.registrarIntencion?.(telefono, respuesta.intencion!, paso).catch(() => {})
    return respuesta
  }

  private async handleInterno(telefono: string, texto: string, doctorContacto?: string): Promise<Respuesta> {
    const estado = this.store.get(telefono)
    const step = estado?.step ?? 'menu'
    const entrada = texto.trim()

    // El flujo de escritura maneja sus propios pasos y su cancelación (T6).
    if (step.startsWith('orden-')) {
      return this.escritor
        ? await this.escritor.handle(telefono, texto, doctorContacto)
        : { kind: 'text', text: 'La creación de órdenes por chat todavía no está disponible. Usa el portal de clínicas o escríbele al laboratorio.' }
    }

    // Cancelable en cualquier paso del flujo.
    if (step !== 'menu' && OPCION_CANCELAR.test(entrada)) {
      this.store.clear(telefono)
      return { kind: 'text', text: `De vuelta al menú.\n\n${buildMenu()}` }
    }

    if (step === 'pedido-numero') {
      if (!esNumero(entrada)) {
        return { kind: 'text', text: 'Escribe solo el número de la orden, o 0 para volver al menú.' }
      }
      this.store.clear(telefono)
      return this.pedido(telefono, entrada)
    }
    if (step === 'control-numero') {
      if (!esNumero(entrada)) {
        return { kind: 'text', text: 'Escribe solo el número de la orden, o 0 para volver al menú.' }
      }
      this.store.clear(telefono)
      return this.control(telefono, entrada)
    }
    if (step === 'cuenta-numero') {
      if (!esNumero(entrada)) {
        return { kind: 'text', text: 'Escribe solo el número de la cuenta de cobro, o 0 para volver al menú.' }
      }
      this.store.clear(telefono)
      return this.cuenta(telefono, entrada)
    }

    // Menú.
    if (entrada === '1') {
      this.store.set(telefono, 'pedido-numero', {})
      return { kind: 'text', text: 'Escribe el número de la orden (o 0 para volver al menú).' }
    }
    if (entrada === '2') {
      this.store.set(telefono, 'control-numero', {})
      return { kind: 'text', text: 'Escribe el número de la orden para enviarte el control de trabajos en PDF (o 0 para volver al menú).' }
    }
    if (entrada === '3') {
      this.store.set(telefono, 'cuenta-numero', {})
      return { kind: 'text', text: 'Escribe el número de la cuenta de cobro para enviártela en PDF (o 0 para volver al menú).' }
    }
    if (entrada === '4') {
      return this.escritor
        ? await this.escritor.handle(telefono, texto, doctorContacto)
        : { kind: 'text', text: 'La creación de órdenes por chat todavía no está disponible. Usa el portal de clínicas o escríbele al laboratorio.' }
    }
    // "0": registra la solicitud de llamada con el tope diario (T7).
    if (entrada === '0') return this.llamada(telefono)
    // Texto desconocido en el menú: el menú de nuevo.
    return { kind: 'text', text: buildMenu() }
  }

  private async llamada(telefono: string): Promise<Respuesta> {
    if (!this.limites.llamada(telefono, Date.now())) {
      return { kind: 'text', text: MENSAJE_LIMITE_LLAMADA, intencion: 'llamada', paso: 'menu' }
    }
    try {
      await this.api.solicitarLlamada(telefono)
      return { kind: 'text', text: LLAMADA_OK, intencion: 'llamada', paso: 'menu' }
    } catch {
      return { kind: 'text', text: LLAMADA_FALLO, intencion: 'llamada', paso: 'menu' }
    }
  }

  private async pedido(telefono: string, ordenId: string): Promise<Respuesta> {
    try {
      const orden = await this.api.getOrden(telefono, ordenId)
      return { kind: 'text', text: formatoOrden(orden) }
    } catch (error) {
      return this.errorPdf(error, PEDIDO_NO_ENCONTRADO)
    }
  }

  private async control(telefono: string, ordenId: string): Promise<Respuesta> {
    try {
      const pdf = await this.api.pdfControlTrabajos(telefono, ordenId)
      return {
        kind: 'document',
        text: `Control de trabajos de la orden ${ordenId}.`,
        filename: `control-${nombreArchivoSeguro(ordenId, ordenId)}.pdf`,
        buffer: pdf,
      }
    } catch (error) {
      return this.errorPdf(error, PEDIDO_NO_ENCONTRADO)
    }
  }

  private async cuenta(telefono: string, cuentaId: string): Promise<Respuesta> {
    try {
      const cuenta = await this.api.getCuentaCobro(telefono, cuentaId)
      if (!cuenta.pdfUrl) {
        return {
          kind: 'text',
          text: `La cuenta ${cuenta.numero} todavía no tiene el PDF disponible. Escríbele al laboratorio.`,
        }
      }
      const pdf = await this.api.descargarPdf(cuenta.pdfUrl)
      return {
        kind: 'document',
        text: `Cuenta de cobro N.º ${cuenta.numero}.`,
        filename: `cuenta-${nombreArchivoSeguro(cuenta.numero, cuentaId)}.pdf`,
        buffer: pdf,
      }
    } catch (error) {
      if (error instanceof UrlRechazadaError) {
        return { kind: 'text', text: 'El PDF de esa cuenta no está disponible en este momento. Escríbele al laboratorio.' }
      }
      return this.errorPdf(error, CUENTA_NO_ENCONTRADA)
    }
  }

  /** 404/403 → palabras, nunca un documento vacío; el resto, texto genérico. */
  private errorPdf(error: unknown, noEncontrado: string): Respuesta {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return { kind: 'text', text: noEncontrado }
    }
    return { kind: 'text', text: 'No pude consultar esa información. Vuelve a intentarlo en un rato.' }
  }
}
