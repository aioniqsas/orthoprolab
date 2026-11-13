import { describe, expect, it } from 'bun:test'
import * as wf from '../src/write-flows.js'
import { PREGUNTA_CONFIRMAR } from '../src/flows.js'
import type { ApiClient, DoctorApi, ServicioApi } from '../src/api.js'
import { ConversationStore } from '../src/estado.js'
import { OrderFlows } from '../src/write-flows.js'

const TEL = '+573001234567'

// La frase literal del hilo real (odd/tasks/whatsapp-ia.md, L8/S9).
const FRASE_REAL =
  'nECESITO CREAR UNA ORDEN PARA el paciente sANTIAGO aRISTIZABAL, HAY QUE HACERLE UNAS PROTESIS DE LOS 14 Y 13, ES URGENTE PARA EL JUEVES, lo atendio el doctor nefario'

const DOCTORES: DoctorApi[] = [
  { id: 'doc-1', nombres: 'Doctor', apellidos: 'Nefario' },
  { id: 'doc-2', nombres: 'Jefferson', apellidos: 'Pinchao' },
]
const SERVICIOS: ServicioApi[] = [
  { id: 's1', nombre: 'Ortodoncia Fija' },
  { id: 's2', nombre: 'Ortodoncia Removible' },
  { id: 's3', nombre: 'Placas de bruxismo' },
  { id: 's4', nombre: 'Protesis' },
]
const PACIENTE_EXISTENTE = { id: '40', nombre: 'Santiago Aristizabal', cedula: '1039' }

interface ApiFalso extends ApiClient {
  ordenesCreadas: unknown[]
}

function apiFalso(conPacienteExistente = false): ApiFalso & { ordenesCreadas: unknown[] } {
  const api: ApiFalso & { ordenesCreadas: unknown[] } = {
    ordenesCreadas: [],
    getDoctores: async () => DOCTORES,
    getServicios: async () => SERVICIOS,
    getPacientes: async () => (conPacienteExistente ? [PACIENTE_EXISTENTE] : []),
    getOrdenes: async () => [],
    crearPaciente: async (_t: string, cedula: string, nombre: string) => ({ id: '9', nombre, cedula }),
    crearOrden: async (_t: string, payload: unknown) => {
      api.ordenesCreadas.push(payload)
      return { id: '1234', estado: { nombre: 'Creada' }, fechaEntrega: null, detalles: [] }
    },
  } as unknown as ApiFalso & { ordenesCreadas: unknown[] }
  return api
}


function escritor(api: ApiClient, store = new ConversationStore()): OrderFlows {
  return new OrderFlows(store, api)
}

describe('IA11/S7–S10: la frase completa toma la orden sin menús ni pasos', () => {
  it('replay del hilo real: solo se pregunta la cédula y se crea tras el sí', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    const mensajes: string[] = []

    // Turno 1: la frase completa.
    const r1 = await esc.handle(TEL, FRASE_REAL)
    mensajes.push(r1.text)
    // Doctor, servicio y dientes ya vinieron en la frase: no se vuelven a preguntar.
    expect(r1.text).not.toContain('doctor es el trabajo')
    expect(r1.text).not.toContain('servicio es el trabajo')
    expect(r1.text).not.toContain('dientes hay que trabajar')
    // La única pregunta es la cédula del paciente.
    expect(r1.text).toContain('No encontré a Santiago Aristizabal en tus pacientes.')
    expect(r1.text).toContain(wf.PREGUNTA_CEDULA)

    // Turno 2: la cédula.
    const r2 = await esc.handle(TEL, '1039445567')
    mensajes.push(r2.text)
    expect(r2.text).toBe(wf.PREGUNTA_CANTIDAD)

    // Turno 3: la cantidad; turno 4: el color; ambos datos los exige el modelo.
    const r3 = await esc.handle(TEL, '1')
    mensajes.push(r3.text)
    expect(r3.text).toBe(wf.PREGUNTA_COLOR)
    const r4 = await esc.handle(TEL, 'A2')
    mensajes.push(r4.text)
    // Una sola frase de confirmación con todo el resumen, sin números de opción.
    expect(r4.text).toContain('Nueva orden:')
    expect(r4.text).toContain('Doctor: Doctor Nefario')
    expect(r4.text).toContain('Paciente: Santiago Aristizabal')
    expect(r4.text).toContain('Servicio: Protesis')
    expect(r4.text).toContain('14 – primer premolar superior derecho')
    expect(r4.text).toContain('14 – primer premolar superior derecho')
    expect(r4.text).toContain(wf.CONFIRMAR_PIE)
    expect(api.ordenesCreadas).toHaveLength(0)

    // Turno 5: el sí crea la orden, una sola vez.
    const r5 = await esc.handle(TEL, 'sí')
    mensajes.push(r5.text)
    expect(r5.text).toContain('Orden 1234 creada.')
    expect(api.ordenesCreadas).toHaveLength(1)
    const payload = api.ordenesCreadas[0]! as unknown as {
      doctorId: string
      pacienteId: number
      detalles: Array<{ servicio: string; cantidad: number; dientes: number[]; colorDiente: string }>
      fechaEntrega?: string
      urgente?: boolean
    }
    // "es urgente para el jueves" (frase real) viaja a la API (whatsapp-humano S1).
    expect(payload).toEqual({
      doctorId: 'doc-1',
      pacienteId: 9,
      detalles: [{ servicio: 'Protesis', cantidad: 1, dientes: [14, 13], colorDiente: 'A2' }],
      fechaEntrega: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      urgente: true,
    })

    // Ningún mensaje de toda la conversación enumera opciones ni habla de pasos.
    for (const mensaje of mensajes) {
      expect(mensaje).not.toMatch(/^\s*\d+[.)]/m)
      expect(mensaje).not.toMatch(/Paso \d/)
      expect(mensaje).not.toMatch(/escribe el número/i)
      expect(mensaje).not.toMatch(/selecciona/i)
      expect(mensaje).not.toMatch(/opción \d/i)
    }
  })

  it('con el paciente ya registrado, la frase completa no pregunta nada antes del resumen', async () => {
    const api = apiFalso(true)
    const esc = escritor(api)
    const r1 = await esc.handle(TEL, FRASE_REAL)
    // El paciente existe y la frase trajo doctor, servicio y dientes:
    // lo único que falta es la cantidad y el color, que el modelo exige.
    expect(r1.text).toBe(wf.PREGUNTA_CANTIDAD)
    expect(r1.text).not.toMatch(/Paso \d/)
    const r2 = await esc.handle(TEL, '2')
    expect(r2.text).toBe(wf.PREGUNTA_COLOR)
    const r3 = await esc.handle(TEL, 'A2')
    expect(r3.text).toContain('Nueva orden:')
    expect(r3.text).toContain('Paciente: Santiago Aristizabal')
    expect(r3.text).toContain(wf.CONFIRMAR_PIE)
    // Solo tras el sí se escribe.
    const r4 = await esc.handle(TEL, 'dale')
    expect(r4.text).toContain(wf.SIN_AVANCE_CONFIRMAR)
    const r5 = await esc.handle(TEL, 'confirmar')
    expect(r5.text).toContain('Orden 1234 creada.')
  })

  it('dos doctores con el mismo nombre se pregunta cuál, por nombre y sin lista', async () => {
    const api = apiFalso()
    ;(api as unknown as Record<string, unknown>).getDoctores = async () => [
      { id: 'a', nombres: 'Carlos', apellidos: 'Ruiz' },
      { id: 'b', nombres: 'Carlos', apellidos: 'Vélez' },
    ]
    const esc = escritor(api)
    const r = await esc.handle(TEL, 'orden nueva del doctor Carlos')
    expect(r.text).toContain('Encontré más de un doctor')
    expect(r.text).toContain('Carlos Ruiz')
    expect(r.text).toContain('Carlos Vélez')
    expect(r.text).not.toMatch(/^\s*\d+[.)]/m)
    // La respuesta elige por nombre, no por número.
    const r2 = await esc.handle(TEL, 'Carlos Vélez')
    expect(r2.text).toBe(wf.PREGUNTA_NOMBRE_PACIENTE)
  })
})

describe('barrido de mensajes del flujo de orden (S7/S8)', () => {
  /** Toda constante de texto del módulo del flujo de orden, colectada, no hardcodeada. */
  const constantes: string[] = []
  for (const [nombre, valor] of Object.entries(wf)) {
    if (typeof valor === 'string') constantes.push(valor)
    if (Array.isArray(valor) && valor.every((v) => typeof v === 'string')) constantes.push(...valor)
  }
  constantes.push(PREGUNTA_CONFIRMAR) // la puerta de confirmación del flujo de orden

  it('ningún mensaje enumera opciones numeradas ni pide "escribe el número"', () => {
    expect(constantes.length).toBeGreaterThan(10)
    for (const texto of constantes) {
      expect({ texto, caso: 'numerada', hay: /^\s*\d+[.)]/m.test(texto).toString() }).toEqual({
        texto,
        caso: 'numerada',
        hay: 'false',
      })
      expect({ texto, caso: 'escribe el número', hay: /escribe el número/i.test(texto).toString() }).toEqual({
        texto,
        caso: 'escribe el número',
        hay: 'false',
      })
      expect({ texto, caso: 'selecciona', hay: /selecciona/i.test(texto).toString() }).toEqual({
        texto,
        caso: 'selecciona',
        hay: 'false',
      })
      expect({ texto, caso: 'opción N', hay: /opción\s+\d/i.test(texto).toString() }).toEqual({
        texto,
        caso: 'opción N',
        hay: 'false',
      })
      expect({ texto, caso: 'Paso X de Y', hay: /Paso \d/.test(texto).toString() }).toEqual({
        texto,
        caso: 'Paso X de Y',
        hay: 'false',
      })
      expect({ texto, caso: '1 sí / 2 no', hay: /\d\s+sí\s*\/\s*\d\s+no/i.test(texto).toString() }).toEqual({
        texto,
        caso: '1 sí / 2 no',
        hay: 'false',
      })
    }
  })
})

describe('nombrePresentable (S9)', () => {
  it('deja el nombre como lo escribiría una persona', () => {
    expect(wf.nombrePresentable('sANTIAGO aRISTIZABAL')).toBe('Santiago Aristizabal')
    expect(wf.nombrePresentable('SANTIAGO')).toBe('Santiago')
    expect(wf.nombrePresentable('maría de los ángeles')).toBe('María de los Ángeles')
  })

  it('el paciente extraído ya sale presentable', () => {
    const texto = 'necesito una orden para el paciente sANTIAGO aRISTIZABAL, prótesis de los 14 y 13'
    expect(wf.pacienteDeTexto(texto)).toBe('Santiago Aristizabal')
  })
})


describe('una anotación en la confirmación no se pierde (L8)', () => {
  it('guarda la observación, la muestra y solo crea tras el sí', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    await esc.handle(TEL, FRASE_REAL)
    await esc.handle(TEL, '1039445567')
    await esc.handle(TEL, '2')
    const resumen = await esc.handle(TEL, 'Blanco')
    expect(resumen.text).toContain('Nueva orden:')

    const anotacion = await esc.handle(TEL, 'Una observacion: test')
    expect(anotacion.text).toContain('Anoté: Una observacion: test')
    expect(anotacion.text).toContain('Observaciones: Una observacion: test')
    expect(anotacion.text).toContain(wf.CONFIRMAR_PIE)
    expect(api.ordenesCreadas).toHaveLength(0)

    const fin = await esc.handle(TEL, 'si')
    expect(fin.text).toContain('Orden 1234 creada.')
    const payload = api.ordenesCreadas[0] as unknown as { detalles: Array<{ observaciones?: string }> }
    expect(payload.detalles[0]!.observaciones).toBe('Una observacion: test')
  })
})

describe('la orden se corrige hablando en la confirmación (L8)', () => {
  it('"añade otra prótesis para el 32" agrega el diente, suma la unidad y vuelve a pedir el sí', async () => {
    const api = apiFalso(true)
    const esc = escritor(api)
    await esc.handle(TEL, FRASE_REAL)
    await esc.handle(TEL, '2')
    await esc.handle(TEL, 'Blanco')
    const antes = await esc.handle(TEL, 'Añade otra protesis para el 32')
    expect(antes.text).toContain('Agregué el 32')
    expect(antes.text).toContain('Cantidad: 3')
    expect(antes.text).toContain('32 – incisivo lateral inferior izquierdo')
    expect(antes.text).toContain(wf.CONFIRMAR_PIE)
    expect(api.ordenesCreadas).toHaveLength(0)

    const fin = await esc.handle(TEL, 'si')
    expect(fin.text).toContain('Orden 1234 creada.')
    const payload = api.ordenesCreadas[0] as unknown as {
      detalles: Array<{ cantidad: number; dientes: number[] }>
    }
    expect(payload.detalles[0]!.cantidad).toBe(3)
    expect(payload.detalles[0]!.dientes).toEqual([14, 13, 32])
  })

  it('un texto que no pide nada no cambia la orden y dice qué sí entiende', async () => {
    const api = apiFalso(true)
    const esc = escritor(api)
    await esc.handle(TEL, FRASE_REAL)
    await esc.handle(TEL, '2')
    await esc.handle(TEL, 'Blanco')
    const r = await esc.handle(TEL, 'dale')
    expect(r.text).toContain(wf.SIN_AVANCE_CONFIRMAR)
    expect(r.text).toContain(wf.AYUDA_CONFIRMAR)
    expect(api.ordenesCreadas).toHaveLength(0)
  })
})
