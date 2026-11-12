import { randomUUID } from 'node:crypto'
import { esDienteValido, nombreDiente } from '@repo/api-client/dientes'
import type { ApiClient, NuevaOrdenPayload, PacienteApi } from './api.js'
import { ApiError } from './api.js'
import { extraerNumero } from './digitos.js'
import { SALUDO } from './menu.js'
import { PREGUNTA_CONFIRMAR } from './flows.js'
import type { ConversationStore } from './state.js'

/**
 * Flujo de escritura: una orden de una sola línea por conversación (S5, S6).
 * Ningún POST /mi-clinica/ordenes ocurre sin el resumen completo y un
 * CONFIRMAR exacto. Todos los pasos son cancelables ("0"/"cancelar") y viven
 * en el ConversationStore con el TTL de 15 minutos. Solo se registra el paso,
 * nunca los valores (contienen datos de pacientes).
 */

// Escape con palabras naturales (IA7/S13); "0" sigue siendo el alias universal.
export const OPCION_CANCELAR_ORDEN = /^(0|cancelar|menú|menu|volver|inicio)$/i
/** Confirmación tolerante (S11): 1, sí/si o confirmar, sin importar mayúsculas. */
export const CONFIRMAR_SI = /^(1|sí|si|confirmar)$/i
export const CONFIRMAR_NO = /^(0|no|cancelar)$/i

type Campos = Record<string, string>

const NO_MAS_500 = 'Las observaciones no pueden superar 500 caracteres.'

/** `26, 27` → "26 – primer molar superior izquierdo, 27 – …" */
function dientesConNombre(campos: Campos): string {
  return (campos.dientes ?? '')
    .split(',')
    .filter((d) => d !== '')
    .map((d) => `${d} – ${nombreDiente(Number(d))}`)
    .join(', ')
}

/** Resumen completo exigido por S6, con los nombres del odontograma. */
export function resumenOrden(campos: Campos): string {
  const observaciones = campos.observaciones ? campos.observaciones : '—'
  return [
    'Nueva orden:',
    `Doctor: ${campos.doctorNombre ?? '—'}`,
    `Paciente: ${campos.pacienteNombre ?? '—'}`,
    `Servicio: ${campos.servicioNombre ?? '—'}`,
    `Cantidad: ${campos.cantidad ?? '—'}`,
    `Dientes: ${dientesConNombre(campos) || '—'}`,
    `Color: ${campos.color ?? '—'}`,
    `Observaciones: ${observaciones}`,
    '',
    'Escribe 1 para crear la orden, o 0 para cancelar.',
  ].join('\n')
}

/** Palabras cortas para un estado de la API, sin volcar el cuerpo del error. */
function textoErrorCreacion(status: number): string {
  if (status === 403 || status === 404) return 'el doctor o el paciente ya no están disponibles en tu clínica'
  if (status === 400) return 'alguno de los datos no fue aceptado'
  if (status === 429) return 'hay demasiadas solicitudes en este momento'
  if (status >= 500) return 'ahora mismo no está disponible'
  return 'no fue posible completar la solicitud'
}

function numerar(opciones: Array<{ nombre: string }>): string {
  return opciones.map((o, i) => `${i + 1}. ${o.nombre}`).join('\n')
}

function indiceValido(entrada: string, total: number): number | null {
  const numero = extraerNumero(entrada)
  if (!numero || !/^\d{1,3}$/.test(numero)) return null
  const n = Number(numero)
  return n >= 1 && n <= total ? n - 1 : null
}

/**
 * "Paso X de Y" (S11/T12, S12/T13): X es el índice de la pregunta en la
 * conversación y Y el total real de preguntas que el usuario contestará.
 * El paso del doctor desaparece con un contacto 1:1; si el usuario aceptó la
 * precarga del trabajo anterior, servicio/cantidad/color no se preguntan.
 * Los dos cálculos se hacen al momento de responder, no al inicio.
 */
function pasosDelFlujo(campos: Campos): string[] {
  const unoAUno = campos.doctor1a1 === '1'
  const repetido = campos.prefillSi === '1'
  return ['doctor', 'paciente', 'servicio', 'cantidad', 'dientes', 'color', 'observaciones'].filter(
    (s) =>
      !(unoAUno && s === 'doctor') &&
      !(repetido && (s === 'servicio' || s === 'cantidad' || s === 'color')),
  )
}

function pasoPrefijo(campos: Campos, step: string): string {
  const pasos = pasosDelFlujo(campos)
  return `Paso ${pasos.indexOf(step) + 1} de ${pasos.length}. `
}

function preguntaCantidad(campos: Campos): string {
  return `${pasoPrefijo(campos, 'cantidad')}¿Cuántas unidades? Escribe un número entero mayor que 0 (o 0 para volver al menú).`
}

function preguntaDientes(campos: Campos): string {
  return `${pasoPrefijo(campos, 'dientes')}Escribe los dientes (números FDI) separados por espacio o coma, por ejemplo: 26 27\n\nO escribe 0 para volver al menú.`
}

function preguntaColor(campos: Campos): string {
  return `${pasoPrefijo(campos, 'color')}¿Color? Escribe el color del trabajo (1–20 caracteres), o 0 para volver al menú.`
}

function preguntaObservaciones(campos: Campos): string {
  return `${pasoPrefijo(campos, 'observaciones')}¿Observaciones? Escríbelas, o escribe no u omitir para dejarlas vacías (0 para volver al menú).`
}

/** Pregunta de precarga (S12): el trabajo y el color de la última orden del doctor. */
function preguntaPrefill(campos: Campos): string {
  return `¿Mismo trabajo y color que tu última orden (${campos.prefillServicio}, ${campos.prefillColor})? 1 sí / 2 no`
}

export class OrderFlows {
  constructor(
    private readonly store: ConversationStore,
    private readonly api: ApiClient,
  ) {}

  /**
   * Un turno del flujo de creación. `doctorContacto` es el doctor 1:1 del
   * contacto verificado (S2): si existe, nunca se pregunta.
   */
  async handle(telefono: string, texto: string, doctorContacto?: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const estado = this.store.get(telefono)
    const step = estado?.step ?? ''
    const entrada = texto.trim()
    const campos = estado?.fields ?? {}

    if (OPCION_CANCELAR_ORDEN.test(entrada)) {
      this.store.clear(telefono)
      return { kind: 'text', text: SALUDO, intencion: 'menu' }
    }

    if (step === '') return this.inicio(telefono, campos, doctorContacto)
    if (step === 'orden-doctor') return this.pasoDoctor(telefono, campos, entrada)
    if (step === 'orden-prefill') return this.pasoPrefill(telefono, campos, entrada)
    if (step === 'orden-paciente') return this.pasoPaciente(telefono, campos, entrada)
    if (step === 'orden-servicio') return this.pasoServicio(telefono, campos, entrada)
    if (step === 'orden-cantidad') return this.pasoCantidad(telefono, campos, entrada)
    if (step === 'orden-dientes') return this.pasoDientes(telefono, campos, entrada)
    if (step === 'orden-color') return this.pasoColor(telefono, campos, entrada)
    if (step === 'orden-observaciones') return this.pasoObservaciones(telefono, campos, entrada)
    if (step === 'orden-confirmar') return this.pasoConfirmar(telefono, campos, entrada)
    return { kind: 'text', text: SALUDO }
  }

  /** Inicio: fija el doctor (silencioso si el contacto lo tiene) y pasa al paciente. */
  private async inicio(telefono: string, campos: Campos, doctorContacto?: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (doctorContacto) {
      let nombre = 'Doctor asignado'
      try {
        const doctor = (await this.api.getDoctores(telefono)).find((d) => d.id === doctorContacto)
        if (doctor) nombre = [doctor.nombres, doctor.apellidos].filter(Boolean).join(' ') || nombre
      } catch {
        // El nombre solo embellece el resumen; el id basta para el POST.
      }
      return this.pedirPrefill(telefono, { ...campos, doctorId: doctorContacto, doctorNombre: nombre, doctor1a1: '1' })
    }
    try {
      const doctores = await this.api.getDoctores(telefono)
      if (doctores.length === 0) {
        this.store.clear(telefono)
        return { kind: 'text', text: 'Tu clínica no tiene doctores activos. Escríbele al laboratorio.' }
      }
      this.store.set(telefono, 'orden-doctor', campos)
      return {
        kind: 'text',
        text: `Paso 1 de 7. Selecciona el doctor (escribe el número):\n\n${numerar(
          doctores.map((d) => ({ nombre: [d.nombres, d.apellidos].filter(Boolean).join(' ') })),
        )}\n\nO escribe 0 para volver al menú.`,
      }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los doctores ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  /**
   * Repite la pregunta del paso en curso (S11/T12): lo usa el aviso de medios
   * no legibles y "ayuda". Nunca regresa al menú ni re-muestra el resumen
   * salvo en el paso de confirmación.
   */
  async repetirPaso(telefono: string): Promise<string> {
    const estado = this.store.get(telefono)
    const step = estado?.step ?? ''
    const campos = estado?.fields ?? {}
    switch (step) {
      case 'orden-doctor':
        try {
          const doctores = await this.api.getDoctores(telefono)
          return `${pasoPrefijo(campos, 'doctor')}Selecciona el doctor (escribe el número):\n\n${numerar(
            doctores.map((d) => ({ nombre: [d.nombres, d.apellidos].filter(Boolean).join(' ') })),
          )}\n\nO escribe 0 para volver al menú.`
        } catch {
          return 'No pude consultar los doctores ahora mismo. Vuelve a intentarlo en un rato.'
        }
      case 'orden-prefill':
        return preguntaPrefill(campos)
      case 'orden-paciente':
        return this.pedirPacienteOtraVez(telefono, campos, 'Elige el paciente de la lista, o crea uno nuevo con: nuevo <cédula> <nombre>').then((r) => r.text)
      case 'orden-servicio':
        return this.pedirServicio(telefono, campos).then((r) => r.text)
      case 'orden-cantidad':
        return preguntaCantidad(campos)
      case 'orden-dientes':
        return preguntaDientes(campos)
      case 'orden-color':
        return preguntaColor(campos)
      case 'orden-observaciones':
        return preguntaObservaciones(campos)
      case 'orden-confirmar':
        return resumenOrden(campos)
      default:
        return SALUDO
    }
  }

  private async pasoDoctor(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const doctores = await this.api.getDoctores(telefono)
      const i = indiceValido(entrada, doctores.length)
      if (i === null) {
        return { kind: 'text', text: 'No entendí. Escribe el número del doctor de la lista, o 0 para volver al menú.' }
      }
      const d = doctores[i]!
      const nombre = [d.nombres, d.apellidos].filter(Boolean).join(' ')
      return this.pedirPrefill(telefono, { ...campos, doctorId: d.id, doctorNombre: nombre })
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los doctores ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  /**
   * Precarga (S12/T13): la última orden del doctor sugiere servicio, cantidad
   * y color. Es solo una optimización: si falla la lista o no hay orden
   * previa, se sigue al paciente en silencio.
   */
  private async pedirPrefill(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      // Una orden cancelada no es "la última orden" de referencia (ronda
      // adversarial T13): se salta. El código es estable; el nombre va por
      // si la API vieja no manda el codigo.
      const ultima = (await this.api.getOrdenes(telefono)).find(
        (o) =>
          o.estado?.codigo !== 'cancelada' &&
          o.estado?.nombre !== 'Cancelada' &&
          o.asignacion?.doctor?.id === campos.doctorId,
      )
      const d = ultima?.detalles?.[0]
      if (!d?.servicio || !d.colorDiente || !Number.isInteger(d.cantidad) || d.cantidad < 1) {
        return this.pedirPaciente(telefono, campos)
      }
      const siguientes = {
        ...campos,
        prefillServicio: d.servicio,
        prefillCantidad: String(d.cantidad),
        prefillColor: d.colorDiente,
      }
      this.store.set(telefono, 'orden-prefill', siguientes)
      return { kind: 'text', text: preguntaPrefill(siguientes) }
    } catch {
      return this.pedirPaciente(telefono, campos)
    }
  }

  /** Respuesta a la precarga: 1 copia los tres valores; 2 los pregunta; otra cosa re-pregunta. */
  private async pasoPrefill(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (CONFIRMAR_SI.test(entrada)) {
      const siguientes = {
        ...campos,
        prefillSi: '1',
        servicioNombre: campos.prefillServicio!,
        cantidad: campos.prefillCantidad!,
        color: campos.prefillColor!,
      }
      return this.pedirPaciente(telefono, siguientes)
    }
    if (!CONFIRMAR_NO.test(entrada) && !/^2$/i.test(entrada)) {
      return { kind: 'text', text: `No entendí. ${preguntaPrefill(campos)}` }
    }
    return this.pedirServicio(telefono, campos)
  }

  private async pedirPaciente(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const pacientes = await this.api.getPacientes(telefono, campos.doctorId!)
      this.store.set(telefono, 'orden-paciente', campos)
      const lista = pacientes.length > 0 ? `${numerar(pacientes.map((p) => ({ nombre: p.nombre })))}\n\n` : ''
      return {
        kind: 'text',
        text: `${pasoPrefijo(campos, 'paciente')}Paciente de ${campos.doctorNombre ?? 'tu doctor'}:\n\n${lista}Escribe el número para elegir, o crea uno nuevo con: nuevo <cédula> <nombre>\n\nO escribe 0 para volver al menú.`,
      }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los pacientes ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  private async pasoPaciente(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const nuevo = /^nuevo\s+(\S+)\s+(.+)$/i.exec(entrada)
    if (nuevo) {
      try {
        const paciente = await this.api.crearPaciente(telefono, nuevo[1]!, nuevo[2]!.trim(), campos.doctorId!)
        return this.continuarTrasPaciente(telefono, {
          ...campos,
          pacienteId: paciente.id,
          pacienteNombre: paciente.nombre,
        })
      } catch (error) {
        // Cédula ya usada o inválida: palabras y la lista de nuevo, sin reintentos ciegos.
        const motivo = error instanceof ApiError && error.status === 409 ? ' (esa cédula ya está registrada)' : ''
        return this.pedirPacienteOtraVez(telefono, campos, `No pude registrar ese paciente${motivo}. Elige de la lista o intenta de nuevo:`)
      }
    }
    try {
      const pacientes = await this.api.getPacientes(telefono, campos.doctorId!)
      const i = indiceValido(entrada, pacientes.length)
      if (i === null) {
        return this.pedirPacienteOtraVez(telefono, campos, 'No entendí. Escribe el número del paciente, "nuevo <cédula> <nombre>" para crear uno, o 0 para volver al menú.')
      }
      const p = pacientes[i]!
      return this.continuarTrasPaciente(telefono, { ...campos, pacienteId: p.id, pacienteNombre: p.nombre })
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los pacientes ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  /** Re-muestra el paso del paciente conservando lo ya recolectado. */
  private async pedirPacienteOtraVez(telefono: string, campos: Campos, encabezado: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const pacientes = await this.api.getPacientes(telefono, campos.doctorId!)
      this.store.set(telefono, 'orden-paciente', campos)
      const lista = pacientes.length > 0 ? `${numerar(pacientes.map((p) => ({ nombre: p.nombre })))}\n\n` : ''
      return { kind: 'text', text: `${encabezado}\n\n${lista}O escribe 0 para volver al menú.` }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los pacientes ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  /** Tras el paciente: con la precarga aceptada, servicio/cantidad/color ya están y se va a dientes. */
  private async continuarTrasPaciente(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (campos.prefillSi === '1') {
      this.store.set(telefono, 'orden-dientes', campos)
      return { kind: 'text', text: preguntaDientes(campos) }
    }
    return this.pedirServicio(telefono, campos)
  }

  private async pedirServicio(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const servicios = await this.api.getServicios(telefono)
      if (servicios.length === 0) {
        this.store.clear(telefono)
        return { kind: 'text', text: 'No hay servicios disponibles ahora mismo. Escríbele al laboratorio.' }
      }
      this.store.set(telefono, 'orden-servicio', campos)
      return {
        kind: 'text',
        text: `${pasoPrefijo(campos, 'servicio')}Selecciona el servicio (escribe el número):\n\n${numerar(
          servicios.map((s) => ({ nombre: s.nombre })),
        )}\n\nO escribe 0 para volver al menú.`,
      }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los servicios ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  private async pasoServicio(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const servicios = await this.api.getServicios(telefono)
      const i = indiceValido(entrada, servicios.length)
      if (i === null) {
        return { kind: 'text', text: 'No entendí. Escribe el número del servicio de la lista, o 0 para volver al menú.' }
      }
      const s = servicios[i]!
      const siguientes = { ...campos, servicioNombre: s.nombre }
      this.store.set(telefono, 'orden-cantidad', siguientes)
      return { kind: 'text', text: preguntaCantidad(siguientes) }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los servicios ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  private async pasoCantidad(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const numero = extraerNumero(entrada)
    if (!numero || !/^\d{1,2}$/.test(numero) || Number(numero) < 1) {
      return { kind: 'text', text: `No entendí. ${preguntaCantidad(campos)}` }
    }
    const siguientes = { ...campos, cantidad: numero }
    this.store.set(telefono, 'orden-dientes', siguientes)
    return { kind: 'text', text: preguntaDientes(siguientes) }
  }

  private async pasoDientes(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const tokens = entrada.split(/[\s,]+/).filter((t) => t !== '')
    if (tokens.length === 0) {
      return { kind: 'text', text: 'Escribe al menos un número de diente (FDI), u 0 para volver al menú.' }
    }
    const vistos = new Set<number>()
    for (const token of tokens) {
      const numero = /^\d{1,3}$/.test(token) ? Number(token) : NaN
      if (!Number.isInteger(numero) || !esDienteValido(numero)) {
        return {
          kind: 'text',
          text: `No entendí. El diente ${token} no es un número FDI válido. Escribe de nuevo los dientes (p. ej. 26 27), o 0 para volver al menú.`,
        }
      }
      vistos.add(numero)
    }
    const siguientes = { ...campos, dientes: [...vistos].join(',') }
    if (campos.prefillSi === '1') {
      // Con la precarga aceptada el color ya no se pregunta: directo a observaciones.
      this.store.set(telefono, 'orden-observaciones', siguientes)
      return { kind: 'text', text: preguntaObservaciones(siguientes) }
    }
    this.store.set(telefono, 'orden-color', siguientes)
    return { kind: 'text', text: preguntaColor(siguientes) }
  }

  private async pasoColor(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const color = entrada.trim()
    if (color.length < 1 || color.length > 20) {
      return { kind: 'text', text: `No entendí. El color debe tener entre 1 y 20 caracteres (o 0 para volver al menú).` }
    }
    const siguientes = { ...campos, color }
    this.store.set(telefono, 'orden-observaciones', siguientes)
    return { kind: 'text', text: preguntaObservaciones(siguientes) }
  }

  private async pasoObservaciones(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const observaciones = /^(no|omitir)$/i.test(entrada) ? '' : entrada.trim()
    if (observaciones.length > 500) {
      return { kind: 'text', text: `${NO_MAS_500}\n\nO escribe 0 para volver al menú.` }
    }
    // Una clave de idempotencia por orden: nace al llegar al resumen y se
    // reutiliza en cada reintento del mismo CONFIRMAR (el interceptor global
    // IdempotencyInterceptor de la API la captura vía cabecera). Cancelar o
    // una orden nueva generan una clave nueva al volver a llegar aquí.
    const siguientes = { ...campos, observaciones, idemKey: randomUUID() }
    this.store.set(telefono, 'orden-confirmar', siguientes)
    return { kind: 'text', text: resumenOrden(siguientes) }
  }

  /**
   * Puerta de confirmación (S6, S11): el resumen siempre se muestra antes de
   * escribir; 1, sí/si o confirmar crean, y 0, no o cancelar descartan. Otra
   * entrada recibe "No entendí" sin llamar a la API.
   */
  private async pasoConfirmar(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (CONFIRMAR_NO.test(entrada)) {
      this.store.clear(telefono)
      return { kind: 'text', text: `Orden descartada.\n\n${SALUDO}`, intencion: 'menu' }
    }
    if (!CONFIRMAR_SI.test(entrada)) {
      return { kind: 'text', text: PREGUNTA_CONFIRMAR }
    }
    const payload: NuevaOrdenPayload = {
      doctorId: campos.doctorId!,
      detalles: [
        {
          servicio: campos.servicioNombre!,
          cantidad: Number(campos.cantidad),
          dientes: (campos.dientes ?? '').split(',').filter((d) => d !== '').map(Number),
          colorDiente: campos.color!,
          ...(campos.observaciones ? { observaciones: campos.observaciones } : {}),
        },
      ],
      ...(campos.pacienteId ? { pacienteId: Number(campos.pacienteId) } : {}),
    }
    try {
      const orden = await this.api.crearOrden(telefono, payload, campos.idemKey)
      this.store.clear(telefono)
      return { kind: 'text', text: `Orden ${orden.id} creada.`, intencion: 'orden_creada' }
    } catch (error) {
      // Los datos se conservan (con la misma clave de idempotencia):
      // CONFIRMAR reintenta, cancelar descarta.
      this.store.set(telefono, 'orden-confirmar', campos)
      // Un error de red o un 5xx puede que sí haya creado la orden (el POST
      // pudo haber llegado y perderse la respuesta): lo decimos y damos la vía
      // de verificación en vez de sugerir un reintento que duplicaría.
      const dudoso = !(error instanceof ApiError) || error.status >= 500
      if (dudoso) {
        const motivo =
          error instanceof ApiError ? textoErrorCreacion(error.status) : 'un problema de conexión'
        return {
          kind: 'text',
          text: `Hubo ${motivo} y la orden puede que se haya creado. Verifica con la opción 1 (estado de pedido) antes de confirmar de nuevo; si no apareció, escribe 1 para reintentar, o 0 para descartar los datos.`,
        }
      }
      const motivo = textoErrorCreacion(error.status)
      return {
        kind: 'text',
        text: `No pude crear la orden (${motivo}). Tus datos siguen guardados: escribe 1 para reintentar, o 0 para descartarlos.`,
      }
    }
  }
}
