import { randomUUID } from 'node:crypto'
import { esDienteValido, nombreDiente } from '@repo/api-client/dientes'
import type { ApiClient, DoctorApi, NuevaOrdenPayload } from './api.js'
import { ApiError } from './api.js'
import { SALUDO } from '\./mensajes.js'
import type { ConversationStore } from './estado.js'
import { PuertaConfirmacion, type TipoEscritura } from './confirmacion.js'
import { entregaDeTexto, fechaLarga } from './tiempo.js'

/**
 * Flujo de escritura conversacional (IA11, S7–S10). Una conversación real:
 * el texto libre se interpreta ANTES de preguntar cualquier cosa y solo se
 * pregunta lo que el modelo de datos exige y la persona no dijo, una
 * pregunta natural por turno. Nunca se enumeran opciones numeradas ni se
 * pide "escribe el número" ni se dice "Paso X de Y": el estado interno vive
 * en el ConversationStore y no se comunica.
 * Ningún POST /mi-clinica/ordenes ocurre sin el resumen completo y un
 * sí/confirmar. Todos los pasos son cancelables ("0"/"cancelar") y viven en
 * el ConversationStore con el TTL de 15 minutos.
 */

// Escape con palabras naturales (IA7/S13); "0" sigue siendo el alias universal.
export const OPCION_CANCELAR_ORDEN = /^(0|cancelar|menú|menu|volver|inicio)$/i
/** Confirmación tolerante (S11): 1, sí/si o confirmar, sin importar mayúsculas. Los dígitos se aceptan aunque nunca se muestran (S7). */
export const CONFIRMAR_SI = /^(1|sí|si|confirmar)$/i
export const CONFIRMAR_NO = /^(0|no|cancelar)$/i

type Campos = Record<string, string>

/** Preguntas del flujo, en lenguaje llano (S7, S8): sin listas, sin pasos. */
export const PREGUNTA_DOCTOR = '¿Con qué doctor es el trabajo?'
export const NO_ENCONTRADO_DOCTOR =
  'No encontré un doctor con ese nombre en tu clínica. ¿Con qué doctor es el trabajo?'
export const PREGUNTA_SERVICIO = '¿Qué servicio es el trabajo?'
export const NO_ENCONTRADO_SERVICIO = 'No encontré ese servicio en el catálogo. ¿Qué servicio es el trabajo?'
export const PREGUNTA_CANTIDAD = '¿Cuántas unidades son?'
export const PREGUNTA_DIENTES =
  '¿En qué dientes hay que trabajar? Escríbelos separados por espacio o coma, por ejemplo 26, 27.'
export const PREGUNTA_COLOR = '¿De qué color es el trabajo?'
export const PREGUNTA_NOMBRE_PACIENTE = '¿Cómo se llama el paciente?'
export const PREGUNTA_NOMBRE_TRAS_CEDULA = '¿Cuál es su nombre completo?'
export const PREGUNTA_CEDULA = '¿Cuál es su cédula para registrarlo como paciente nuevo?'

export const AYUDA_CONFIRMAR =
  'Si quieres cambiar algo, dímelo con tus palabras: puedo agregar dientes, cambiar la cantidad, el color o la fecha de entrega, marcarla urgente, o dejar una observación.'
/** S3 (whatsapp-humano): la confirmación nunca dice "No entendí" a secas. */
export const SIN_AVANCE_CONFIRMAR =
  `Quedo pendiente de tu sí para crear la orden, o un no para descartarla. ${AYUDA_CONFIRMAR}`
export const PREGUNTA_VARIOS_PACIENTES =
  'Encontré varios pacientes con ese nombre. Escribe el nombre completo, por favor.'
export const CONFIRMAR_PIE = 'Responde sí para crear la orden o no para cancelar.'
export const NO_MAS_500 = 'Las observaciones no pueden superar 500 caracteres.'
export const SIN_DOCTORES = 'Tu clínica no tiene doctores activos. Escríbele al laboratorio.'
export const SIN_SERVICIOS = 'No hay servicios disponibles ahora mismo. Escríbele al laboratorio.'
export const NO_DISPONIBLE_DOCTORES = 'No pude consultar los doctores ahora mismo. Vuelve a intentarlo en un rato.'
export const NO_DISPONIBLE_PACIENTES = 'No pude consultar los pacientes ahora mismo. Vuelve a intentarlo en un rato.'
export const NO_DISPONIBLE_SERVICIOS = 'No pude consultar los servicios ahora mismo. Vuelve a intentarlo en un rato.'
export const NO_DISPONIBLE_ORDENES = 'No pude consultar tus órdenes ahora mismo. Vuelve a intentarlo en un rato.'

/** Fragmentos de mensajes con datos dinámicos; el resto sale de constantes. */
export const MENSAJES_ORDEN: readonly string[] = [
  'No encontré a',
  'en tus pacientes.',
  'Encontré más de un',
  '¿Cuál es?',
  'No entendí. ¿Con qué doctor es el trabajo?',
  'No pude registrar a',
  'esa cédula ya está registrada',
  'Responde sí o no.',
  'Necesito la cédula (solo números) para registrarlo.',
]

const NO_ENCONTRADO_PACIENTE = (nombre: string): string =>
  `No encontré a ${nombre} en tus pacientes. ${PREGUNTA_CEDULA}`
const VARIOS = (clase: string, nombres: string[]): string =>
  `Encontré más de un ${clase}: ${nombres.join(' y ')}. ¿Cuál es?`
const CEDULA_RECHAZADA = (nombre: string, motivo: string): string =>
  `No pude registrar a ${nombre} (${motivo}). ${PREGUNTA_CEDULA}`
const CEDULA_FALTA = 'Necesito la cédula (solo números) para registrarlo.'

/** `26, 27` → "26 – primer molar superior izquierdo, 27 – …" */
function dientesConNombre(campos: Campos): string {
  return (campos.dientes ?? '')
    .split(',')
    .filter((d) => d !== '')
    .map((d) => `${d} – ${nombreDiente(Number(d))}`)
    .join(', ')
}

/** La línea de entrega del resumen (S2): fecha larga y "(urgente)" cuando aplica. */
function lineaEntrega(campos: Campos): string | null {
  if (campos.fechaEntrega) return `Entrega: ${fechaLarga(campos.fechaEntrega)}${campos.urgente ? ' (urgente)' : ''}`
  if (campos.urgente) return 'Entrega: por definir (urgente)'
  return null
}

/** Resumen completo exigido por S6, con los nombres del odontograma (S7: sin números de opción). */
export function resumenOrden(campos: Campos): string {
  const observaciones = campos.observaciones ? campos.observaciones : '—'
  const entrega = lineaEntrega(campos)
  return [
    'Nueva orden:',
    `Doctor: ${campos.doctorNombre ?? '—'}`,
    `Paciente: ${campos.pacienteNombre ?? '—'}`,
    `Servicio: ${campos.servicioNombre ?? '—'}`,
    `Cantidad: ${campos.cantidad ?? '—'}`,
    `Dientes: ${dientesConNombre(campos) || '—'}`,
    `Color: ${campos.color ?? '—'}`,
    ...(entrega ? [entrega] : []),
    `Observaciones: ${observaciones}`,
    '',
    CONFIRMAR_PIE,
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

export function nombreCompleto(nombres: string, apellidos: string): string {
  return [nombres, apellidos].filter(Boolean).join(' ')
}

/**
 * Coincidencia tolerante (S7): sin tildes, sin mayúsculas, con nombres a
 * medias. Coincide si todo el nombre cabe en lo escrito ("doctor nefario")
 * o si todo lo escrito cabe en el nombre ("nefario", "santiago"). Devuelve
 * los índices de TODAS las coincidencias: una sola se elige, varias se
 * preguntan por nombre, ninguna se re-pregunta sin lista.
 */
export function normalizarParaCoincidir(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Palabras de relleno y tratamientos que no ayudan a distinguir un nombre. */
const PARAR = new Set([
  'la', 'el', 'los', 'las', 'del', 'de', 'para', 'por', 'con', 'que', 'se', 'su', 'sus',
  'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 'al', 'en', 'hoy', 'lo', 'me', 'mi',
  'mis', 'es', 'fue', 'hay', 'necesito', 'quiero', 'quisiera', 'orden', 'ordenes',
  'pedido', 'paciente', 'atendio', 'doctor', 'doctora', 'dr', 'dra',
])

function tokensUtiles(texto: string): string[] {
  return normalizarParaCoincidir(texto)
    .split(' ')
    .filter((t) => t !== '' && !PARAR.has(t))
}

export function coincidirNombre(consulta: string, nombres: string[]): number[] {
  const q = normalizarParaCoincidir(consulta)
  if (q.length < 3) return []
  const qt = tokensUtiles(consulta)
  const fuertes: number[] = []
  const débiles: number[] = []
  nombres.forEach((nombre, i) => {
    const n = normalizarParaCoincidir(nombre)
    const nt = tokensUtiles(nombre)
    if (nt.length === 0) return
    const nombreEnTexto = nt.every((t) => q.includes(t))
    const textoEnNombre = qt.length > 0 && qt.every((t) => n.includes(t))
    // Un solo token fuerte compartido también cuenta ("la doctora ana", "nefario"):
    // cuenta solo como débil, y cualquier coincidencia fuerte la descarta.
    const tokenCompartido =
      qt.some((t) => t.length >= 3 && n.includes(t)) || nt.some((t) => t.length >= 3 && q.includes(t))
    if (nombreEnTexto || textoEnNombre) fuertes.push(i)
    else if (tokenCompartido) débiles.push(i)
  })
  return fuertes.length > 0 ? fuertes : débiles
}

/** Dientes FDI válidos que aparecen solos en el texto ("protesis de los 14 y 13" → 13,14). */
export function dientesDeTexto(texto: string): string {
  const vistos = new Set<number>()
  for (const m of texto.matchAll(/(?:^|\s)(\d{1,2})(?=\s|$|[,.])/g)) {
    const n = Number(m[1])
    if (esDienteValido(n)) vistos.add(n)
  }
  return [...vistos].join(',')
}

/** Nombre del paciente tras la palabra "paciente", hasta la coma o el punto. */
export function pacienteDeTexto(texto: string): string {
  const m = /\bpaciente\s+([^,.;\n]+?)(?=\s*[,.;\n]|\s*$)/i.exec(texto)
  return m ? nombrePresentable(m[1]!.trim()) : ''
}

/**
 * Escribe el nombre como lo haría una persona. La gente escribe a gritos o
 * mezclando mayúsculas ("sANTIAGO aRISTIZABAL") y repetírselo así suena a mofa.
 */
export function nombrePresentable(nombre: string): string {
  const particulas = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'dos'])
  return nombre
    .trim()
    .split(/\s+/)
    .filter((palabra) => palabra !== '')
    .map((palabra, i) => {
      const limpia = palabra.toLocaleLowerCase('es')
      if (i > 0 && particulas.has(limpia)) return limpia
      return limpia.charAt(0).toLocaleUpperCase('es') + limpia.slice(1)
    })
    .join(' ')
}

/** ¿Hay una frase de verdad? Evita interpretar "4" del menú como datos (S9). */
function esFrase(texto: string): boolean {
  return /[a-záéíóúñ]{3,}/i.test(texto)
}

/** Pregunta de precarga (S12): el trabajo y el color de la última orden del doctor. */
function preguntaPrefill(campos: Campos): string {
  return `¿Mismo trabajo y color que tu última orden (${campos.prefillServicio}, ${campos.prefillColor})? Responde sí o no.`
}

export class OrderFlows {
  constructor(
    private readonly store: ConversationStore,
    private readonly api: ApiClient,
    private readonly puerta: PuertaConfirmacion = new PuertaConfirmacion(),
  ) {}

  /** Limpia la confirmación pendiente de este teléfono (escape/reinicio). */
  limpiar(telefono: string): void {
    this.puerta.limpiar(telefono)
  }

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

    if (step === '') return this.inicio(telefono, campos, entrada, doctorContacto)
    if (step === 'orden-doctor') return this.pasoDoctor(telefono, campos, entrada)
    if (step === 'orden-prefill') return this.pasoPrefill(telefono, campos, entrada)
    if (step === 'orden-paciente') return this.pasoPaciente(telefono, campos, entrada)
    if (step === 'orden-servicio') return this.pasoServicio(telefono, campos, entrada)
    if (step === 'orden-cantidad') return this.pasoCantidad(telefono, campos, entrada)
    if (step === 'orden-dientes') return this.pasoDientes(telefono, campos, entrada)
    if (step === 'orden-color') return this.pasoColor(telefono, campos, entrada)
    if (step === 'orden-confirmar') return this.pasoConfirmar(telefono, campos, entrada)
    return { kind: 'text', text: SALUDO }
  }

  /** Inicio (S9): interpreta la frase ANTES de preguntar nada. */
  private async inicio(
    telefono: string,
    campos: Campos,
    entrada: string,
    doctorContacto?: string,
  ): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (doctorContacto && !campos.doctorId) {
      let nombre = 'Doctor asignado'
      try {
        const doctor = (await this.api.getDoctores(telefono)).find((d) => d.id === doctorContacto)
        if (doctor) nombre = nombreCompleto(doctor.nombres, doctor.apellidos) || nombre
      } catch {
        // El nombre solo embellece el resumen; el id basta para el POST.
      }
      campos = { ...campos, doctorId: doctorContacto, doctorNombre: nombre }
    }
    if (esFrase(entrada)) {
      // Con una frase completa la precarga del trabajo anterior sobra: ya dijo
      // (o no dijo) qué quiere, y ofrecer "¿mismo trabajo?" solo añade ruido.
      campos = { ...campos, prefillPreguntado: '1' }
      // S1 (whatsapp-humano): "urgente para el jueves" se entiende desde el
      // primer mensaje; la fecha se resuelve hacia adelante, en código.
      const entrega = entregaDeTexto(entrada, new Date())
      if (entrega.fecha) campos = { ...campos, fechaEntrega: entrega.fecha }
      if (entrega.urgente) campos = { ...campos, urgente: '1' }
      const paciente = pacienteDeTexto(entrada)
      if (paciente !== '') campos = { ...campos, pacienteTexto: paciente }
      const dientes = dientesDeTexto(entrada)
      if (dientes !== '') campos = { ...campos, dientes }
    }
    try {
      if (!campos.doctorId) {
        const doctores = await this.api.getDoctores(telefono)
        if (doctores.length === 0) {
          this.store.clear(telefono)
          return { kind: 'text', text: SIN_DOCTORES }
        }
        const m = coincidirNombre(entrada, doctores.map((d) => nombreCompleto(d.nombres, d.apellidos)))
        if (m.length === 1) {
          const d = doctores[m[0]!]!
          campos = { ...campos, doctorId: d.id, doctorNombre: nombreCompleto(d.nombres, d.apellidos) }
        } else if (m.length > 1) {
          this.store.set(telefono, 'orden-doctor', campos)
          return {
            kind: 'text',
            text: VARIOS('doctor', m.map((i) => nombreCompleto(doctores[i]!.nombres, doctores[i]!.apellidos))),
          }
        } else {
          this.store.set(telefono, 'orden-doctor', campos)
          return { kind: 'text', text: PREGUNTA_DOCTOR }
        }
      }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_DOCTORES }
    }
    try {
      if (!campos.servicioNombre) {
        const servicios = await this.api.getServicios(telefono)
        if (servicios.length === 0) {
          this.store.clear(telefono)
          return { kind: 'text', text: SIN_SERVICIOS }
        }
        const m = coincidirNombre(entrada, servicios.map((s) => s.nombre))
        if (m.length === 1) {
          campos = { ...campos, servicioNombre: servicios[m[0]!]!.nombre }
        } else if (m.length > 1) {
          this.store.set(telefono, 'orden-servicio', campos)
          return { kind: 'text', text: VARIOS('servicio', m.map((i) => servicios[i]!.nombre)) }
        }
        // Sin coincidencia: se pregunta en su orden (o se ofrece la precarga).
      }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_SERVICIOS }
    }
    return this.siguientePaso(telefono, campos)
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
        return PREGUNTA_DOCTOR
      case 'orden-prefill':
        return preguntaPrefill(campos)
      case 'orden-paciente':
        return campos.pacienteNombre
          ? `${NO_ENCONTRADO_PACIENTE(campos.pacienteNombre)}`
          : PREGUNTA_NOMBRE_PACIENTE
      case 'orden-servicio':
        return PREGUNTA_SERVICIO
      case 'orden-cantidad':
        return PREGUNTA_CANTIDAD
      case 'orden-dientes':
        return PREGUNTA_DIENTES
      case 'orden-color':
        return PREGUNTA_COLOR
      case 'orden-confirmar':
        return resumenOrden(campos)
      default:
        return SALUDO
    }
  }

  /** El siguiente dato faltante, en orden: paciente, servicio, cantidad, dientes, color, confirmación. */
  private async siguientePaso(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (!campos.pacienteId) {
      if (!campos.prefillPreguntado && !campos.servicioNombre) return this.pedirPrefill(telefono, campos)
      return this.pedirPaciente(telefono, campos)
    }
    if (!campos.servicioNombre) return this.pedirServicio(telefono, campos)
    if (!campos.cantidad) {
      this.store.set(telefono, 'orden-cantidad', campos)
      return { kind: 'text', text: PREGUNTA_CANTIDAD }
    }
    if (!campos.dientes) {
      this.store.set(telefono, 'orden-dientes', campos)
      return { kind: 'text', text: PREGUNTA_DIENTES }
    }
    if (!campos.color) {
      this.store.set(telefono, 'orden-color', campos)
      return { kind: 'text', text: PREGUNTA_COLOR }
    }
    // Una clave de idempotencia por orden: nace al llegar al resumen y se
    // reutiliza en cada reintento del mismo sí (el interceptor global
    // IdempotencyInterceptor de la API la captura vía cabecera). Cancelar o
    // una orden nueva generan una clave nueva al volver a llegar aquí.
    const siguientes = { ...campos, idemKey: campos.idemKey ?? randomUUID() }
    this.store.set(telefono, 'orden-confirmar', siguientes)
    const resumen = resumenOrden(siguientes)
    // Estado de confirmación explícito y verificable (S4/T3): propuesta pendiente.
    this.puerta.proponer(telefono, 'crear_orden', resumen, { ...siguientes })
    return { kind: 'text', text: resumen }
  }

  private async pasoDoctor(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const doctores = await this.api.getDoctores(telefono)
      const m = coincidirNombre(entrada, doctores.map((d) => nombreCompleto(d.nombres, d.apellidos)))
      if (m.length === 0) return { kind: 'text', text: NO_ENCONTRADO_DOCTOR }
      if (m.length > 1) {
        return {
          kind: 'text',
          text: VARIOS('doctor', m.map((i) => nombreCompleto(doctores[i]!.nombres, doctores[i]!.apellidos))),
        }
      }
      const d = doctores[m[0]!]!
      return this.siguientePaso(telefono, {
        ...campos,
        doctorId: d.id,
        doctorNombre: nombreCompleto(d.nombres, d.apellidos),
      })
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_DOCTORES }
    }
  }

  /**
   * Precarga (S12/T13): la última orden del doctor sugiere servicio, cantidad
   * y color. Es solo una optimización: si falla la lista o no hay orden
   * previa, se sigue al paciente en silencio.
   */
  private async pedirPrefill(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const siguientes = { ...campos, prefillPreguntado: '1' }
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
        return this.pedirPaciente(telefono, siguientes)
      }
      const conPrefill = {
        ...siguientes,
        prefillServicio: d.servicio,
        prefillCantidad: String(d.cantidad),
        prefillColor: d.colorDiente,
      }
      this.store.set(telefono, 'orden-prefill', conPrefill)
      return { kind: 'text', text: preguntaPrefill(conPrefill) }
    } catch {
      return this.pedirPaciente(telefono, siguientes)
    }
  }

  /** Respuesta a la precarga: sí copia los tres valores; no los pregunta; otra cosa re-pregunta. */
  private async pasoPrefill(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (CONFIRMAR_SI.test(entrada)) {
      const siguientes = {
        ...campos,
        servicioNombre: campos.prefillServicio!,
        cantidad: campos.prefillCantidad!,
        color: campos.prefillColor!,
      }
      return this.siguientePaso(telefono, siguientes)
    }
    if (/^(0|no|cancelar|2)$/i.test(entrada)) {
      return this.pedirPaciente(telefono, campos)
    }
    return { kind: 'text', text: `No entendí. ${preguntaPrefill(campos)}` }
  }

  private async pedirPaciente(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      if (campos.pacienteTexto) {
        const pacientes = await this.api.getPacientes(telefono, campos.doctorId!)
        const m = coincidirNombre(campos.pacienteTexto, pacientes.map((p) => p.nombre))
        if (m.length === 1) {
          const p = pacientes[m[0]!]!
          return this.siguientePaso(telefono, { ...campos, pacienteId: p.id, pacienteNombre: p.nombre })
        }
        if (m.length > 1) {
          this.store.set(telefono, 'orden-paciente', campos)
          return { kind: 'text', text: PREGUNTA_VARIOS_PACIENTES }
        }
        const siguientes = { ...campos, pacienteNombre: campos.pacienteTexto }
        this.store.set(telefono, 'orden-paciente', siguientes)
        return { kind: 'text', text: NO_ENCONTRADO_PACIENTE(siguientes.pacienteNombre) }
      }
      this.store.set(telefono, 'orden-paciente', campos)
      return { kind: 'text', text: PREGUNTA_NOMBRE_PACIENTE }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_PACIENTES }
    }
  }

  private async crearYPaciente(
    telefono: string,
    campos: Campos,
    cedula: string,
    nombre: string,
  ): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const paciente = await this.api.crearPaciente(telefono, cedula, nombre, campos.doctorId!)
      return this.siguientePaso(telefono, {
        ...campos,
        pacienteId: paciente.id,
        pacienteNombre: paciente.nombre,
      })
    } catch (error) {
      // Cédula ya usada o inválida: palabras y la pregunta de nuevo, sin reintentos ciegos.
      const motivo = error instanceof ApiError && error.status === 409 ? 'esa cédula ya está registrada' : 'no fue aceptada por el laboratorio'
      return { kind: 'text', text: CEDULA_RECHAZADA(nombre, motivo) }
    }
  }

  /**
   * Respuesta del paso del paciente: un nombre busca en los pacientes de la
   * clínica (coincidencia tolerante); una cédula sola registra con el nombre
   * ya conocido; "cédula nombre" registra directo.
   */
  private async pasoPaciente(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const soloDigitos = entrada.replace(/\D/g, '')
    if (/^[\d\s.\-#]+$/.test(entrada) && soloDigitos.length >= 4 && soloDigitos.length <= 15) {
      if (campos.pacienteNombre) {
        return this.crearYPaciente(telefono, campos, soloDigitos, campos.pacienteNombre)
      }
      this.store.set(telefono, 'orden-paciente', { ...campos, cedulaPendiente: soloDigitos })
      return { kind: 'text', text: PREGUNTA_NOMBRE_TRAS_CEDULA }
    }
    const conNombre = /^(.*\d[\d\s.\-#]*?)\s+([^\d].+)$/.exec(entrada)
    if (conNombre) {
      const cedula = conNombre[1]!.replace(/\D/g, '')
      const nombre = conNombre[2]!.trim()
      if (cedula.length >= 4 && cedula.length <= 15) {
        return this.crearYPaciente(telefono, campos, cedula, nombre)
      }
    }
    // Texto: buscar el paciente entre los existentes.
    try {
      const pacientes = await this.api.getPacientes(telefono, campos.doctorId!)
      const m = coincidirNombre(entrada, pacientes.map((p) => p.nombre))
      if (m.length === 1) {
        const p = pacientes[m[0]!]!
        return this.siguientePaso(telefono, { ...campos, pacienteId: p.id, pacienteNombre: p.nombre })
      }
      if (m.length > 1) return { kind: 'text', text: PREGUNTA_VARIOS_PACIENTES }
      if (campos.cedulaPendiente) {
        return this.crearYPaciente(telefono, campos, campos.cedulaPendiente, entrada)
      }
      const siguientes = { ...campos, pacienteNombre: entrada }
      this.store.set(telefono, 'orden-paciente', siguientes)
      return { kind: 'text', text: NO_ENCONTRADO_PACIENTE(entrada) }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_PACIENTES }
    }
  }

  private async pedirServicio(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const servicios = await this.api.getServicios(telefono)
      if (servicios.length === 0) {
        this.store.clear(telefono)
        return { kind: 'text', text: SIN_SERVICIOS }
      }
      this.store.set(telefono, 'orden-servicio', campos)
      return { kind: 'text', text: PREGUNTA_SERVICIO }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_SERVICIOS }
    }
  }

  private async pasoServicio(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const servicios = await this.api.getServicios(telefono)
      const m = coincidirNombre(entrada, servicios.map((s) => s.nombre))
      if (m.length === 0) return { kind: 'text', text: NO_ENCONTRADO_SERVICIO }
      if (m.length > 1) {
        return { kind: 'text', text: VARIOS('servicio', m.map((i) => servicios[i]!.nombre)) }
      }
      return this.siguientePaso(telefono, { ...campos, servicioNombre: servicios[m[0]!]!.nombre })
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_SERVICIOS }
    }
  }

  private async pasoCantidad(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const numero = entrada.replace(/\D/g, '')
    if (numero === '' || numero.length > 2 || Number(numero) < 1) {
      return { kind: 'text', text: `No entendí. ${PREGUNTA_CANTIDAD}` }
    }
    return this.siguientePaso(telefono, { ...campos, cantidad: numero })
  }

  private async pasoDientes(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const crudos = [...entrada.matchAll(/\d{1,3}/g)].map((m) => m[0])
    if (crudos.length === 0) {
      return { kind: 'text', text: `No entendí. ${PREGUNTA_DIENTES}` }
    }
    const vistos = new Set<number>()
    for (const crudo of crudos) {
      const numero = Number(crudo)
      if (!Number.isInteger(numero) || !esDienteValido(numero)) {
        return {
          kind: 'text',
          text: `No entendí. El diente ${crudo} no es un número FDI válido. Escríbelos de nuevo (p. ej. 26, 27).`,
        }
      }
      vistos.add(numero)
    }
    return this.siguientePaso(telefono, { ...campos, dientes: [...vistos].join(',') })
  }

  private async pasoColor(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const color = entrada.trim()
    if (color.length < 1 || color.length > 20) {
      return { kind: 'text', text: `No entendí. El color debe tener entre 1 y 20 caracteres.` }
    }
    return this.siguientePaso(telefono, { ...campos, color })
  }

  /**
   * Puerta de confirmación (S6, S11): el resumen siempre se muestra antes de
   * escribir; 1, sí/si o confirmar crean, y 0, no o cancelar descartan. Otra
   * entrada recibe "No entendí" sin llamar a la API.
   */
  /**
   * Cambios que se dicen hablando en la confirmación: dientes nuevos, cantidad
   * o color. Devuelve null si el texto no pide ningún cambio, para no inventar.
   */
  private aplicarCambio(campos: Campos, entrada: string): { campos: Campos; aviso: string } | null {
    const avisos: string[] = []
    let actualizados: Campos = { ...campos }
    // Entrega y urgencia también se dicen en la confirmación (S1): "necesito
    // que sea urgente para el jueves" cambia la orden, no es ruido.
    const entrega = entregaDeTexto(entrada, new Date())
    if (entrega.fecha) {
      actualizados = { ...actualizados, fechaEntrega: entrega.fecha }
      avisos.push(`Queda para el ${fechaLarga(entrega.fecha)}`)
    }
    if (entrega.urgente && !campos.urgente) {
      actualizados = { ...actualizados, urgente: '1' }
      avisos.push('La marqué urgente')
    }
    const previos = (campos.dientes ?? '').split(',').filter((d) => d !== '')
    const nuevos = dientesDeTexto(entrada)
      .split(',')
      .filter((d) => d !== '' && !previos.includes(d))
    if (nuevos.length > 0) {
      const suma = /\b(otra|otro|adicional|adicionales|mas|más)\b/i.test(entrada) ? nuevos.length : 0
      const cantidad = Number(campos.cantidad ?? 0)
      actualizados = {
        ...actualizados,
        dientes: [...previos, ...nuevos].join(','),
        ...(suma > 0 ? { cantidad: String(cantidad + suma) } : {}),
      }
      avisos.push(`Agregué el ${nuevos.join(' y el ')}`)
    }
    const color = /\bcolor\s*(?:a|en|:)?\s*([\p{L}0-9]{1,12})/iu.exec(entrada)
    if (color?.[1]) {
      actualizados = { ...actualizados, color: color[1] }
      avisos.push(`Color: ${color[1]}`)
    }
    const cantidadPedida = /\bcantidad\s*(?:a|de|:)?\s*(\d{1,2})\b/i.exec(entrada)
    if (cantidadPedida?.[1]) {
      actualizados = { ...actualizados, cantidad: cantidadPedida[1] }
      avisos.push(`Cantidad: ${cantidadPedida[1]}`)
    }
    return avisos.length > 0 ? { campos: actualizados, aviso: avisos.join('. ') } : null
  }

  private async pasoConfirmar(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (CONFIRMAR_NO.test(entrada)) {
      this.puerta.consumir(telefono)
      this.store.clear(telefono)
      return { kind: 'text', text: `Orden descartada.\n\n${SALUDO}`, intencion: 'menu' }
    }
    if (!CONFIRMAR_SI.test(entrada)) {
      // En la confirmación también se corrige la orden hablando: "añade otra
      // prótesis para el 32" no es ni un sí, ni un no, ni una nota.
      const cambio = this.aplicarCambio(campos, entrada)
      if (cambio) {
        this.store.set(telefono, 'orden-confirmar', cambio.campos)
        const resumen = resumenOrden(cambio.campos)
        this.puerta.proponer(telefono, 'crear_orden', resumen, { ...cambio.campos })
        // El resumen ya termina pidiendo el sí (S3): el pie no se repite.
        return {
          kind: 'text',
          text: `${cambio.aviso}.\n\n${resumen}`,
        }
      }
      // "Una observación: test" no es una confirmación, pero tampoco es ruido:
      // el resumen muestra "Observaciones: —", así que hay que poder llenarlo.
      const anotacion = entrada.trim().slice(0, 300)
      if (anotacion.length >= 3 && /(observaci[oó]n|observaciones|nota|anota|agrega|agregar|ojo)\b|:/i.test(anotacion)) {
        const juntas = [campos.observaciones?.trim(), anotacion].filter(Boolean).join(' / ').slice(0, 500)
        const actualizados: Campos = { ...campos, observaciones: juntas }
        this.store.set(telefono, 'orden-confirmar', actualizados)
        const resumen = resumenOrden(actualizados)
        this.puerta.proponer(telefono, 'crear_orden', resumen, { ...actualizados })
        return {
          kind: 'text',
          text: `Anoté: ${anotacion}\n\n${resumen}`,
        }
      }
      return { kind: 'text', text: SIN_AVANCE_CONFIRMAR }
    }
    // Puerta de confirmación explícita y verificable (S4/T3): sin confirmación
    // previa registrada, la herramienta de escritura no se ejecuta.
    const confirmada = this.puerta.confirmar(telefono, entrada)
    if (!confirmada || confirmada.tipo !== 'crear_orden') {
      // Reafirmar la propuesta pendiente para que el usuario pueda confirmar.
      this.puerta.proponer(telefono, 'crear_orden', resumenOrden(campos), { ...campos })
      return { kind: 'text', text: `Necesito tu confirmación antes de crear la orden. ${resumenOrden(campos)}` }
    }
    const observaciones = (campos.observaciones ?? '').slice(0, 500)
    const payload: NuevaOrdenPayload = {
      doctorId: campos.doctorId!,
      detalles: [
        {
          servicio: campos.servicioNombre!,
          cantidad: Number(campos.cantidad),
          dientes: (campos.dientes ?? '').split(',').filter((d) => d !== '').map(Number),
          colorDiente: campos.color!,
          ...(observaciones ? { observaciones } : {}),
        },
      ],
      ...(campos.pacienteId ? { pacienteId: Number(campos.pacienteId) } : {}),
      ...(campos.fechaEntrega ? { fechaEntrega: campos.fechaEntrega } : {}),
      ...(campos.urgente ? { urgente: true } : {}),
    }
    try {
      const orden = await this.api.crearOrden(telefono, payload, campos.idemKey)
      this.puerta.consumir(telefono)
      this.store.clear(telefono)
      return { kind: 'text', text: `Orden ${orden.id} creada.`, intencion: 'orden_creada' }
    } catch (error) {
      // Los datos se conservan (con la misma clave de idempotencia):
      // sí reintenta, cancelar descarta. Se exige confirmar de nuevo.
      this.store.set(telefono, 'orden-confirmar', campos)
      this.puerta.proponer(telefono, 'crear_orden', resumenOrden(campos), { ...campos })
      // Un error de red o un 5xx puede que sí haya creado la orden (el POST
      // pudo haber llegado y perderse la respuesta): lo decimos y damos la vía
      // de verificación en vez de sugerir un reintento que duplicaría.
      const dudoso = !(error instanceof ApiError) || error.status >= 500
      if (dudoso) {
        const motivo = error instanceof ApiError ? textoErrorCreacion(error.status) : 'un problema de conexión'
        return {
          kind: 'text',
          text: `Hubo ${motivo} y la orden puede que se haya creado. Verifica cómo va tu pedido (escribe 0 y pide el estado) antes de confirmar de nuevo; responde sí para reintentar o no para descartar los datos.`,
        }
      }
      const motivo = textoErrorCreacion(error.status)
      return {
        kind: 'text',
        text: `No pude crear la orden (${motivo}). Tus datos siguen guardados: responde sí para reintentar o no para descartarlos.`,
      }
    }
  }
}
