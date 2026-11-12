import { randomUUID } from 'node:crypto'
import { esDienteValido, nombreDiente } from '@repo/api-client/dientes'
import type { ApiClient, NuevaOrdenPayload, PacienteApi } from './api.js'
import { ApiError } from './api.js'
import { buildMenu } from './menu.js'
import type { ConversationStore } from './state.js'

/**
 * Flujo de escritura: una orden de una sola línea por conversación (S5, S6).
 * Ningún POST /mi-clinica/ordenes ocurre sin el resumen completo y un
 * CONFIRMAR exacto. Todos los pasos son cancelables ("0"/"cancelar") y viven
 * en el ConversationStore con el TTL de 15 minutos. Solo se registra el paso,
 * nunca los valores (contienen datos de pacientes).
 */

export const OPCION_CANCELAR_ORDEN = /^(0|cancelar)$/i

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
    'Escribe CONFIRMAR para crear la orden, o cancelar para descartarla.',
  ].join('\n')
}

/** Palabras cortas para un estado de la API, sin volcar el cuerpo del error. */
function textoErrorCreacion(status: number): string {
  if (status === 403 || status === 404) return 'el doctor o el paciente ya no están disponibles en tu clínica'
  if (status === 400) return 'alguno de los datos no fue aceptado'
  if (status === 429) return 'hay demasiadas solicitudes en este momento'
  if (status >= 500) return 'el servicio no está disponible en este momento'
  return 'no fue posible completar la solicitud'
}

function numerar(opciones: Array<{ nombre: string }>): string {
  return opciones.map((o, i) => `${i + 1}. ${o.nombre}`).join('\n')
}

function indiceValido(entrada: string, total: number): number | null {
  if (!/^\d{1,3}$/.test(entrada)) return null
  const n = Number(entrada)
  return n >= 1 && n <= total ? n - 1 : null
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
      return { kind: 'text', text: `De vuelta al menú.\n\n${buildMenu()}`, intencion: 'menu' }
    }

    if (step === '') return this.inicio(telefono, campos, doctorContacto)
    if (step === 'orden-doctor') return this.pasoDoctor(telefono, campos, entrada)
    if (step === 'orden-paciente') return this.pasoPaciente(telefono, campos, entrada)
    if (step === 'orden-servicio') return this.pasoServicio(telefono, campos, entrada)
    if (step === 'orden-cantidad') return this.pasoCantidad(telefono, campos, entrada)
    if (step === 'orden-dientes') return this.pasoDientes(telefono, campos, entrada)
    if (step === 'orden-color') return this.pasoColor(telefono, campos, entrada)
    if (step === 'orden-observaciones') return this.pasoObservaciones(telefono, campos, entrada)
    if (step === 'orden-confirmar') return this.pasoConfirmar(telefono, campos, entrada)
    return { kind: 'text', text: buildMenu() }
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
      return this.pedirPaciente(telefono, { ...campos, doctorId: doctorContacto, doctorNombre: nombre })
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
        text: `Selecciona el doctor (escribe el número):\n\n${numerar(
          doctores.map((d) => ({ nombre: [d.nombres, d.apellidos].filter(Boolean).join(' ') })),
        )}\n\nO escribe 0 para volver al menú.`,
      }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los doctores ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  private async pasoDoctor(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const doctores = await this.api.getDoctores(telefono)
      const i = indiceValido(entrada, doctores.length)
      if (i === null) {
        return { kind: 'text', text: 'Escribe el número del doctor de la lista, o 0 para volver al menú.' }
      }
      const d = doctores[i]!
      const nombre = [d.nombres, d.apellidos].filter(Boolean).join(' ')
      return this.pedirPaciente(telefono, { ...campos, doctorId: d.id, doctorNombre: nombre })
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los doctores ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  private async pedirPaciente(telefono: string, campos: Campos): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    try {
      const pacientes = await this.api.getPacientes(telefono, campos.doctorId!)
      this.store.set(telefono, 'orden-paciente', campos)
      const lista = pacientes.length > 0 ? `${numerar(pacientes.map((p) => ({ nombre: p.nombre })))}\n\n` : ''
      return {
        kind: 'text',
        text: `Paciente de ${campos.doctorNombre ?? 'tu doctor'}:\n\n${lista}Escribe el número para elegir, o crea uno nuevo con: nuevo <cédula> <nombre>\n\nO escribe 0 para volver al menú.`,
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
        return this.pedirServicio(telefono, {
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
        return this.pedirPacienteOtraVez(telefono, campos, 'Escribe el número del paciente, "nuevo <cédula> <nombre>" para crear uno, o 0 para volver al menú.')
      }
      const p = pacientes[i]!
      return this.pedirServicio(telefono, { ...campos, pacienteId: p.id, pacienteNombre: p.nombre })
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
        text: `Selecciona el servicio (escribe el número):\n\n${numerar(
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
        return { kind: 'text', text: 'Escribe el número del servicio de la lista, o 0 para volver al menú.' }
      }
      const s = servicios[i]!
      const siguientes = { ...campos, servicioNombre: s.nombre }
      this.store.set(telefono, 'orden-cantidad', siguientes)
      return { kind: 'text', text: '¿Cuántas unidades? Escribe un número entero mayor que 0 (o 0 para volver al menú).' }
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude consultar los servicios ahora mismo. Vuelve a intentarlo en un rato.' }
    }
  }

  private async pasoCantidad(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (!/^\d{1,2}$/.test(entrada) || Number(entrada) < 1) {
      return { kind: 'text', text: 'Escribe un número entero mayor que 0 (o 0 para volver al menú).' }
    }
    const siguientes = { ...campos, cantidad: entrada }
    this.store.set(telefono, 'orden-dientes', siguientes)
    return {
      kind: 'text',
      text: 'Escribe los dientes (números FDI) separados por espacio o coma, por ejemplo: 26 27\n\nO escribe 0 para volver al menú.',
    }
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
          text: `El diente ${token} no es un número FDI válido. Escribe de nuevo los dientes (p. ej. 26 27), o 0 para volver al menú.`,
        }
      }
      vistos.add(numero)
    }
    const siguientes = { ...campos, dientes: [...vistos].join(',') }
    this.store.set(telefono, 'orden-color', siguientes)
    return { kind: 'text', text: '¿Color? Escribe el color del trabajo (1–20 caracteres), o 0 para volver al menú.' }
  }

  private async pasoColor(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const color = entrada.trim()
    if (color.length < 1 || color.length > 20) {
      return { kind: 'text', text: 'El color debe tener entre 1 y 20 caracteres (o 0 para volver al menú).' }
    }
    const siguientes = { ...campos, color }
    this.store.set(telefono, 'orden-observaciones', siguientes)
    return {
      kind: 'text',
      text: '¿Observaciones? Escríbelas, o escribe no u omitir para dejarlas vacías (0 para volver al menú).',
    }
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
   * Puerta de confirmación (S6): solo el texto exacto `CONFIRMAR` escribe.
   * Cualquier otra entrada re-muestra el resumen sin llamar a la API; tras un
   * fallo el estado se conserva para reintentar con CONFIRMAR.
   */
  private async pasoConfirmar(telefono: string, campos: Campos, entrada: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    if (entrada !== 'CONFIRMAR') {
      return { kind: 'text', text: resumenOrden(campos) }
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
          text: `Hubo ${motivo} y la orden puede que se haya creado. Verifica con la opción 1 (estado de pedido) antes de confirmar de nuevo; si no apareció, escribe CONFIRMAR para reintentar, o cancelar para descartar los datos.`,
        }
      }
      const motivo = textoErrorCreacion(error.status)
      return {
        kind: 'text',
        text: `No pude crear la orden (${motivo}). Tus datos siguen guardados: escribe CONFIRMAR para reintentar, o cancelar para descartarlos.`,
      }
    }
  }
}
