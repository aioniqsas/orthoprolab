import type { ApiClient, OrdenApi } from './api.js'
import { ApiError, UrlRechazadaError } from './api.js'
import { extraerNumero } from './digitos.js'
import { buildMenu, SALUDO } from './menu.js'
import type { Ruta } from './llm.js'
import { MENSAJE_LIMITE_LLAMADA, RateLimiter } from './rate-limit.js'
import type { ConversationStore } from './state.js'
import { OrdenExistenteFlows, PASO_CAMBIO } from './orden-existente.js'
import { UltimaOrdenVista } from './state.js'
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

/** Preguntas fijas de los pasos de lectura, reutilizadas al repetir el paso. */
export const PREGUNTA_PEDIDO = 'Escribe el número de la orden (o 0 para volver al menú).'
export const PREGUNTA_CONTROL =
  'Escribe el número de la orden para enviarte el control de trabajos en PDF (o 0 para volver al menú).'
export const PREGUNTA_CUENTA =
  'Escribe el número de la cuenta de cobro para enviártela en PDF (o 0 para volver al menú).'
export const PREGUNTA_AYUDA = '¿Quieres que el laboratorio te llame? 1 sí / 0 no'
export const PREGUNTA_CONFIRMAR = 'Responde sí para crear la orden o no para cancelar'
export const AVISO_AUDIO = 'No puedo escuchar audios, escríbeme por favor'
export const AVISO_MEDIA = 'No puedo abrir eso, escríbeme por favor'

/** Copia honesta de la opción 5 (T7): nunca promete una llamada que no se registró. */
export const LLAMADA_OK = 'Listo. Registramos tu solicitud: el laboratorio te llamaremos a este número.'
export const LLAMADA_FALLO =
  'No pude registrar tu solicitud de llamada ahora mismo. Contacta al laboratorio directamente por el portal o por teléfono.'

/** Intención de auditoría (S8) derivada del paso previo, sin el texto del mensaje. */
export function intencionDe(step: string, texto: string): string {
  // "ayuda" pregunta antes de llamar; la intención ya es de llamada (S11).
  if (/^(ayuda|help)$/i.test(texto.trim())) return 'llamada'
  if (step === 'menu' && texto.trim() === '5') return 'llamada'
  if (step === PASO_CAMBIO) return 'estado'
  if (step === 'pedido-numero') return 'estado'
  if (step === 'control-numero') return 'control'
  if (step === 'cuenta-numero') return 'cuenta'
  if (step.startsWith('orden-')) return 'orden_creada'
  return 'menu'
}

export const PEDIDO_NO_ENCONTRADO =
  'No encontré esa orden. Revisa el número, por favor, o escribe 0 para volver al menú.'
export const CUENTA_NO_ENCONTRADA =
  'No encontré esa cuenta de cobro. Revisa el número, por favor, o escribe 0 para volver al menú.'

// Escape con palabras naturales (IA7/S13): "0" sigue siendo el alias universal.
const OPCION_CANCELAR = /^(0|cancelar|menú|menu|volver|inicio)$/i
const PALABRA_AYUDA = /^(ayuda|help)$/i

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
  private readonly existente: OrdenExistenteFlows

  constructor(
    private readonly store: ConversationStore,
    private readonly api: ApiClient,
    private readonly escritor?: OrderFlows,
    private readonly limites: RateLimiter = new RateLimiter(),
    existente?: OrdenExistenteFlows,
    private readonly ultima = new UltimaOrdenVista(),
  ) {
    this.existente = existente ?? new OrdenExistenteFlows(store, api, () => new Date(), ultima)
  }

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

    // "ayuda" (S11): pregunta antes de actuar; jamás llama sin confirmar.
    if (PALABRA_AYUDA.test(entrada)) {
      this.store.set(telefono, 'ayuda', { ...(estado?.fields ?? {}), previo: step })
      return { kind: 'text', text: PREGUNTA_AYUDA }
    }
    if (step === 'ayuda') {
      const previo = estado?.fields.previo ?? 'menu'
      if (entrada === '1') {
        const respuesta = await this.llamada(telefono)
        // Pedir ayuda no puede costar el trabajo a medias: se vuelve al paso
        // donde estaba en vez de descartar lo que ya había respondido.
        if (previo === 'menu') {
          this.store.clear(telefono)
          return respuesta
        }
        const campos = { ...estado?.fields }
        delete campos.previo
        this.store.set(telefono, previo, campos)
        return {
          kind: 'text',
          text: `${respuesta.text}\n\nSigamos:\n${await this.preguntaDelPaso(telefono, previo)}`,
        }
      }
      if (OPCION_CANCELAR.test(entrada)) {
        const campos = { ...estado?.fields }
        delete campos.previo
        if (previo === 'menu') {
          this.store.clear(telefono)
          return { kind: 'text', text: SALUDO }
        }
        this.store.set(telefono, previo, campos)
        return { kind: 'text', text: await this.preguntaDelPaso(telefono, previo) }
      }
      return { kind: 'text', text: `No entendí. ${PREGUNTA_AYUDA}` }
    }

    // Una conversación sobre una orden que ya existe (S2–S7): el borrador vive
    // en ConversationStore y cada turno reinterpreta el mensaje completo.
    if (step === PASO_CAMBIO) return this.existente.handle(telefono, texto)

    // El flujo de escritura maneja sus propios pasos y su cancelación (T6).
    if (step.startsWith('orden-')) {
      return this.escritor
        ? await this.escritor.handle(telefono, texto, doctorContacto)
        : { kind: 'text', text: 'La creación de órdenes por chat todavía no está disponible. Usa el portal de clínicas o escríbele al laboratorio.' }
    }

    // Cancelable en cualquier paso del flujo; el escape vuelve al saludo (IA7).
    if (step !== 'menu' && OPCION_CANCELAR.test(entrada)) {
      this.store.clear(telefono)
      return { kind: 'text', text: SALUDO }
    }

    if (step === 'pedido-numero') {
      const numero = extraerNumero(entrada)
      if (!numero || !/^\d{1,9}$/.test(numero)) {
        return { kind: 'text', text: `No entendí. ${PREGUNTA_PEDIDO}` }
      }
      this.store.clear(telefono)
      return this.pedido(telefono, numero)
    }
    if (step === 'control-numero') {
      const numero = extraerNumero(entrada)
      if (!numero || !/^\d{1,9}$/.test(numero)) {
        return { kind: 'text', text: `No entendí. ${PREGUNTA_CONTROL}` }
      }
      this.store.clear(telefono)
      return this.control(telefono, numero)
    }
    if (step === 'cuenta-numero') {
      const numero = extraerNumero(entrada)
      if (!numero || !/^\d{1,9}$/.test(numero)) {
        return { kind: 'text', text: `No entendí. ${PREGUNTA_CUENTA}` }
      }
      this.store.clear(telefono)
      return this.cuenta(telefono, numero)
    }

    // Menú. Con modelo, main enruta por el LLM antes de llegar aquí; sin
    // modelo este menú numerado es la red de seguridad (IA7/S13). El escape
    // con palabras naturales vuelve al saludo sin números.
    if (OPCION_CANCELAR.test(entrada)) return { kind: 'text', text: SALUDO }
    if (entrada === '1') {
      this.store.set(telefono, 'pedido-numero', {})
      return { kind: 'text', text: PREGUNTA_PEDIDO }
    }
    if (entrada === '2') {
      this.store.set(telefono, 'control-numero', {})
      return { kind: 'text', text: PREGUNTA_CONTROL }
    }
    if (entrada === '3') {
      this.store.set(telefono, 'cuenta-numero', {})
      return { kind: 'text', text: PREGUNTA_CUENTA }
    }
    if (entrada === '4') {
      return this.escritor
        ? await this.escritor.handle(telefono, texto, doctorContacto)
        : { kind: 'text', text: 'La creación de órdenes por chat todavía no está disponible. Usa el portal de clínicas o escríbele al laboratorio.' }
    }
    // "0": volver al menú, siempre significa lo mismo (S11). La solicitud de
    // llamada vive en la opción 5 y en "ayuda".
    if (entrada === '0') return { kind: 'text', text: buildMenu() }
    if (entrada === '5') return this.llamada(telefono)
    // Texto desconocido en el menú: "No entendí" + el menú de nuevo.
    return { kind: 'text', text: `No entendí.\n\n${buildMenu()}` }
  }

  /** La pregunta del paso actual, para repetirla tras un medio no legible o tras "ayuda → 0". */
  private async preguntaDelPaso(telefono: string, step: string): Promise<string> {
    if (step === PASO_CAMBIO) return this.existente.repetirPaso(telefono)
    if (step.startsWith('orden-') && this.escritor) return this.escritor.repetirPaso(telefono)
    if (step === 'pedido-numero') return PREGUNTA_PEDIDO
    if (step === 'control-numero') return PREGUNTA_CONTROL
    if (step === 'cuenta-numero') return PREGUNTA_CUENTA
    if (step === 'ayuda') return PREGUNTA_AYUDA
    return SALUDO
  }

  /**
   * Ejecuta una ruta decidida por el modelo (IA7/S13): el modelo elige la
   * puerta, el flujo determinista es el ejecutor. Nunca escribe ni confirma
   * por su cuenta: `nuevo_pedido` entra al OrderFlows igual que la opción 4.
   */
  async atenderRuta(telefono: string, ruta: Ruta, doctorContacto?: string): Promise<Respuesta> {
    const pasoPrevio = this.store.get(telefono)?.step ?? 'menu'
    let respuesta: Respuesta
    switch (ruta.tipo) {
      case 'nuevo_pedido':
        respuesta = this.escritor
          ? await this.escritor.handle(telefono, ruta.texto ?? '', doctorContacto)
          : { kind: 'text', text: 'La creación de órdenes por chat todavía no está disponible. Usa el portal de clínicas o escríbele al laboratorio.' }
        break
      case 'buscar_orden':
      case 'editar_orden':
        // El flujo reinterpreta el mensaje completo: el modelo elige la puerta.
        respuesta = await this.existente.handle(telefono, ruta.texto ?? '')
        break
      case 'pedir_llamada':
        // Misma puerta que "ayuda": pregunta antes de registrar la llamada (S11).
        this.store.set(telefono, 'ayuda', { previo: pasoPrevio })
        respuesta = { kind: 'text', text: PREGUNTA_AYUDA }
        break
      case 'ver_pedido':
        if (ruta.numero) {
          this.store.clear(telefono)
          // Queda recordada: lo siguiente que diga ("agrega el diente 34") es
          // sobre esta orden, sin tener que repetir cuál era.
          this.ultima.recordar(telefono, ruta.numero)
          respuesta = await this.pedido(telefono, ruta.numero)
        } else {
          this.store.set(telefono, 'pedido-numero', {})
          respuesta = { kind: 'text', text: PREGUNTA_PEDIDO }
        }
        break
      case 'enviar_control':
        if (ruta.numero) {
          this.store.clear(telefono)
          respuesta = await this.control(telefono, ruta.numero)
        } else {
          this.store.set(telefono, 'control-numero', {})
          respuesta = { kind: 'text', text: PREGUNTA_CONTROL }
        }
        break
      case 'enviar_cuenta':
        if (ruta.numero) {
          this.store.clear(telefono)
          respuesta = await this.cuenta(telefono, ruta.numero)
        } else {
          this.store.set(telefono, 'cuenta-numero', {})
          respuesta = { kind: 'text', text: PREGUNTA_CUENTA }
        }
        break
    }
    if (respuesta.intencion === undefined) {
      const intenciones = {
        ver_pedido: 'estado',
        enviar_control: 'control',
        enviar_cuenta: 'cuenta',
        nuevo_pedido: 'orden',
        pedir_llamada: 'llamada',
        buscar_orden: 'estado',
        editar_orden: 'orden_creada',
      } as const
      respuesta.intencion = intenciones[ruta.tipo]
      respuesta.paso = pasoPrevio
    }
    void this.api.registrarIntencion?.(telefono, respuesta.intencion!, pasoPrevio).catch(() => {})
    return respuesta
  }

  /**
   * Medios no legibles (S11/T12): audio y el resto. El aviso va seguido de la
   * pregunta del paso en curso, nunca del menú; el estado no cambia.
   */
  async media(telefono: string, esAudio: boolean): Promise<Respuesta> {
    const estado = this.store.get(telefono)
    const step = estado?.step ?? 'menu'
    const aviso = esAudio ? AVISO_AUDIO : AVISO_MEDIA
    return { kind: 'text', text: `${aviso}\n\n${await this.preguntaDelPaso(telefono, step)}`, intencion: 'media', paso: step }
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
