import { describe, expect, it } from 'bun:test'
import { ApiError, type ApiClient, type DoctorApi, type ServicioApi } from '../src/api.js'
import { buildMenu } from '../src/menu.js'
import { ConversationStore } from '../src/state.js'
import { ReadFlows } from '../src/flows.js'
import { OrderFlows } from '../src/write-flows.js'

const TEL = '+573001234567'

const DOCTORES: DoctorApi[] = [{ id: 'doc-1', nombres: 'Ana', apellidos: 'Gómez' }]
const PACIENTES = [{ id: '1', paciente: { id: '7', nombre: 'Luis Pérez', cedula: '1030' } }]
const SERVICIOS: ServicioApi[] = [{ id: 's1', nombre: 'Corona zirconio' }]

type CrearOrdenLlamada = { telefono: string; payload: unknown; idempotencyKey?: string }

interface ApiFalso extends ApiClient {
  crearOrdenLlamadas: CrearOrdenLlamada[]
  crearOrdenError?: Error
}

function apiFalso(
  opciones: { crearOrdenError?: Error; ordenes?: unknown[]; getOrdenesError?: Error } = {},
): ApiFalso {
  const api: ApiFalso = {
    crearOrdenLlamadas: [],
    crearOrdenError: opciones.crearOrdenError,
    getOrdenes: async () => {
      if (opciones.getOrdenesError) throw opciones.getOrdenesError
      return opciones.ordenes ?? []
    },
    getDoctores: async () => DOCTORES,
    getPacientes: async () => PACIENTES.map((f) => f.paciente),
    crearPaciente: async (_t: string, cedula: string, nombre: string, doctorId?: string) => {
      // Sin doctorId la API devuelve el paciente sin vínculo: el flujo debe fallar aquí, no en silencio.
      if (!doctorId) throw new Error('crearPaciente sin doctorId')
      if (cedula === '1030') throw new ApiError(409, 'ya existe')
      return { id: '9', nombre }
    },
    getServicios: async () => SERVICIOS,
    crearOrden: async (telefono: string, payload: unknown, idempotencyKey?: string) => {
      api.crearOrdenLlamadas.push({ telefono, payload, idempotencyKey })
      if (api.crearOrdenError) throw api.crearOrdenError
      return { id: '1234', estado: { nombre: 'Creada' }, fechaEntrega: null, detalles: [] }
    },
  } as unknown as ApiFalso
  return api
}

function escritor(api: ApiClient, store = new ConversationStore()): OrderFlows {
  return new OrderFlows(store, api)
}

async function enviar(esc: OrderFlows, textos: string[], doctorContacto?: string): Promise<{ text: string; kind: string }> {
  let r: { kind: string; text: string } = { kind: 'text', text: '' }
  for (const t of textos) r = (await esc.handle(TEL, t, doctorContacto)) as { kind: string; text: string }
  return r
}

function leerFlows(api: ApiClient, esc: OrderFlows): ReadFlows {
  const store = new ConversationStore()
  return new ReadFlows(store, api, esc)
}

describe('flujo 4: crear orden (S5, S6)', () => {
  it('feliz completo: menú → 4 → doctor → paciente → servicio → cantidad → dientes → color → observaciones → CONFIRMAR', async () => {
    const api = apiFalso()
    const store = new ConversationStore()
    const esc = escritor(api, store)
    const r = await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'urgente', 'CONFIRMAR'])
    expect(r.kind).toBe('text')
    expect(r.text).toContain('Orden 1234')
    expect(api.crearOrdenLlamadas).toHaveLength(1)
    expect(api.crearOrdenLlamadas[0]!.telefono).toBe(TEL)
    expect(api.crearOrdenLlamadas[0]!.payload).toEqual({
      doctorId: 'doc-1',
      pacienteId: 7,
      detalles: [
        {
          servicio: 'Corona zirconio',
          cantidad: 2,
          dientes: [26, 27],
          colorDiente: 'A1',
          observaciones: 'urgente',
        },
      ],
    })
    // Estado limpio tras el éxito.
    expect(store.get(TEL)).toBeUndefined()
  })

  it('el payload coincide con lo que mostró el resumen', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    const resumen = await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    expect(resumen.text).toContain('Doctor: Ana Gómez')
    // Entrada desconocida en el paso de confirmación: "No entendí" explícito.
    const r = await enviar(esc, ['__CONFIRMAR__'])
    expect(r.text).toBe('No entendí. Escribe 1 para crear o 0 para cancelar')
    const r2 = await enviar(esc, ['CONFIRMAR'])
    expect(r2.text).toContain('Orden 1234')
    expect(api.crearOrdenLlamadas[0]!.payload).toEqual({
      doctorId: 'doc-1',
      pacienteId: 7,
      detalles: [{ servicio: 'Corona zirconio', cantidad: 2, dientes: [26, 27], colorDiente: 'A1' }],
    })
  })

  it('doctor del contacto: se usa en silencio, sin preguntar', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    const r = await enviar(esc, ['4'], 'doc-1')
    expect(r.text).toContain('Paciente de Ana Gómez')
    expect(r.text).toContain('Luis Pérez')
  })

  it('el resumen nombra los dientes con la tabla compartida de @repo/api-client', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    expect(r.text).toContain('26 – primer molar superior izquierdo')
    expect(r.text).toContain('27 – segundo molar superior izquierdo')
  })

  it('palabras ajenas a la confirmación no escriben y piden "No entendí"', async () => {
    for (const palabra of ['dale', 'ok']) {
      const api = apiFalso()
      const esc = escritor(api)
      await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
      const r = await enviar(esc, [palabra])
      expect(api.crearOrdenLlamadas).toHaveLength(0)
      expect(r.text).toBe('No entendí. Escribe 1 para crear o 0 para cancelar')
    }
  })

  it('confirmación tolerante (S11): 1, sí, si y confirmar crean; 0, no y cancelar descartan', async () => {
    for (const palabra of ['1', 'sí', 'si', 'SI', ' Confirmar ']) {
      const api = apiFalso()
      const esc = escritor(api)
      await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
      const r = await enviar(esc, [palabra])
      expect(r.text).toContain('Orden 1234')
      expect(api.crearOrdenLlamadas).toHaveLength(1)
    }
    for (const palabra of ['0', 'cancelar']) {
      const api = apiFalso()
      const esc = escritor(api)
      await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
      const r = await enviar(esc, [palabra])
      expect(api.crearOrdenLlamadas).toHaveLength(0)
      // 0 siempre significa volver al menú (S11).
      expect(r.text).toContain('De vuelta al menú')
    }
    for (const palabra of ['no', 'NO']) {
      const api = apiFalso()
      const esc = escritor(api)
      await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
      const r = await enviar(esc, [palabra])
      expect(api.crearOrdenLlamadas).toHaveLength(0)
      expect(r.text).toContain('Orden descartada')
    }
  })

  it('cancelar en el paso del doctor (paso 1) vuelve al menú y borra el estado', async () => {
    const api = apiFalso()
    const store = new ConversationStore()
    const esc = escritor(api, store)
    await esc.handle(TEL, '4')
    expect(store.get(TEL)?.step).toBe('orden-doctor')
    const r = await esc.handle(TEL, 'cancelar')
    expect(r.text).toContain(buildMenu())
    expect(store.get(TEL)).toBeUndefined()
  })

  it('cancelar en el paso del paciente (paso 2) y en el de servicio (paso 3)', async () => {
    for (const pasos of [['4', '1'], ['4', '1', '1']]) {
      const api = apiFalso()
      const store = new ConversationStore()
      const esc = escritor(api, store)
      for (const p of pasos) await esc.handle(TEL, p)
      const r = await esc.handle(TEL, '0')
      expect(r.text).toContain('De vuelta al menú')
      expect(store.get(TEL)).toBeUndefined()
      expect(api.crearOrdenLlamadas).toHaveLength(0)
    }
  })

  it('cédula nueva crea el paciente y sigue el flujo', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1', 'nuevo 8845 María Ruiz', '1', '1', '26', 'A2', 'no', 'CONFIRMAR'])
    expect(r.text).toContain('Orden 1234')
    const payload = api.crearOrdenLlamadas[0]!.payload as { pacienteId: number }
    expect(payload.pacienteId).toBe(9)
  })

  it('cédula rechazada por la API: lo dice con palabras y ofrece la lista de nuevo', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    await esc.handle(TEL, '4')
    await esc.handle(TEL, '1')
    const r = await esc.handle(TEL, 'nuevo 1030 Alguien')
    expect(r.text).toContain('No pude registrar ese paciente')
    expect(r.text).toContain('Luis Pérez')
    // El paso sigue siendo el del paciente, sin reintento ciego.
    const r2 = await esc.handle(TEL, '1')
    expect(r2.text).toContain('Corona zirconio')
  })

  it('diente inválido: nombra el código ofensor y vuelve a preguntar sin perder lo anterior', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1', '2'])
    const r = await esc.handle(TEL, '26 99')
    expect(r.text).toContain('99')
    expect(r.text).toContain('diente')
    const r2 = await esc.handle(TEL, '26 27')
    // La respuesta ya no es el error de dientes sino el paso siguiente (color).
    expect(r2.text).toContain('color')
    await enviar(esc, ['A1', 'no', 'CONFIRMAR'])
    const payload = api.crearOrdenLlamadas[0]!.payload as { detalles: Array<{ dientes: number[] }> }
    expect(payload.detalles[0]!.dientes).toEqual([26, 27])
  })

  it('dientes repetidos se deduplican', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1', '2', '26, 26 27', 'A1', 'no', 'CONFIRMAR'])
    const payload = api.crearOrdenLlamadas[0]!.payload as { detalles: Array<{ dientes: number[] }> }
    expect(payload.detalles[0]!.dientes).toEqual([26, 27])
  })

  it('cantidad inválida re-pregunta sin perder el servicio; válida sigue', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1'])
    const r = await esc.handle(TEL, 'dos')
    expect(r.text).toContain('número entero')
    const r2 = await esc.handle(TEL, '2')
    expect(r2.text).toContain('dientes')
    await enviar(esc, ['26', 'A1', 'no', 'CONFIRMAR'])
    const payload = api.crearOrdenLlamadas[0]!.payload as { detalles: Array<{ cantidad: number; servicio: string }> }
    expect(payload.detalles[0]!.cantidad).toBe(2)
    expect(payload.detalles[0]!.servicio).toBe('Corona zirconio')
  })

  it('fallo del POST: conserva el estado en confirmar para reintentar', async () => {
    // 400: el aviso de reintento seguro sigue vigente para errores de validación.
    const api = apiFalso({ crearOrdenError: new ApiError(400, 'boom') })
    const store = new ConversationStore()
    const esc = escritor(api, store)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    const r = await esc.handle(TEL, 'CONFIRMAR')
    expect(api.crearOrdenLlamadas).toHaveLength(1)
    expect(r.text).toContain('No pude crear la orden')
    expect(store.get(TEL)?.step).toBe('orden-confirmar')
  })

  it('fallo del POST y luego CONFIRMAR reintentado escribe una sola vez', async () => {
    const api = apiFalso({ crearOrdenError: new ApiError(500, 'boom') })
    const store = new ConversationStore()
    const esc = escritor(api, store)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    await esc.handle(TEL, 'CONFIRMAR')
    // La API se recupera.
    api.crearOrdenError = undefined
    const r = await esc.handle(TEL, 'CONFIRMAR')
    expect(r.text).toContain('Orden 1234')
    expect(api.crearOrdenLlamadas).toHaveLength(2)
  })

  it('cualquier otra entrada en el paso de confirmación pide 1 o 0, sin escribir', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    const r = await esc.handle(TEL, '¿listo?')
    expect(r.text).toBe('No entendí. Escribe 1 para crear o 0 para cancelar')
    expect(api.crearOrdenLlamadas).toHaveLength(0)
  })

  it('el resumen obligatorio dice 1 crea y 0 cancela (S11)', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    expect(r.text).toContain('Escribe 1 para crear la orden, o 0 para cancelar.')
    expect(r.text).toContain('Servicio: Corona zirconio')
  })

  it('ReadFlows delega la opción 4 al escritor', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    const flows = leerFlows(api, esc)
    const r = await flows.handle(TEL, '4')
    expect(r.text).toContain('doctor')
  })

  it('ReadFlows sin escritor mantiene el mensaje anterior', async () => {
    const flows = new ReadFlows(new ConversationStore(), apiFalso())
    const r = await flows.handle(TEL, '4')
    expect(r.text).toContain('todavía no está disponible')
  })
})

describe('precarga del trabajo y color de la última orden (S12/T13)', () => {
  const ULTIMA = {
    id: '99',
    estado: { nombre: 'Terminada' },
    fechaEntrega: null,
    asignacion: { doctor: { id: 'doc-1', nombres: 'Ana', apellidos: 'Gómez' }, paciente: { nombre: 'Luis Pérez' } },
    detalles: [{ servicio: 'Corona zirconio', cantidad: 3, dientes: [16], colorDiente: 'A2' }],
  }

  it('ofrece la precarga con la pregunta exacta y los valores citados', async () => {
    const api = apiFalso({ ordenes: [ULTIMA] })
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1'])
    expect(r.text).toBe('¿Mismo trabajo y color que tu última orden (Corona zirconio, A2)? 1 sí / 2 no')
  })

  it('1 copia servicio, cantidad y color y salta directo al paciente', async () => {
    const api = apiFalso({ ordenes: [ULTIMA] })
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1', '1', '1', '26 27', 'no'])
    // El resumen muestra los valores precargados tal cual se envían.
    expect(r.text).toContain('Servicio: Corona zirconio')
    expect(r.text).toContain('Cantidad: 3')
    expect(r.text).toContain('Color: A2')
    const r2 = await esc.handle(TEL, 'CONFIRMAR')
    expect(r2.text).toContain('Orden 1234')
    const payload = api.crearOrdenLlamadas[0]!.payload as {
      detalles: Array<{ servicio: string; cantidad: number; colorDiente: string; dientes: number[] }>
    }
    expect(payload.detalles[0]).toEqual({ servicio: 'Corona zirconio', cantidad: 3, dientes: [26, 27], colorDiente: 'A2' })
  })

  it('2 pregunta servicio, cantidad y color como siempre', async () => {
    const api = apiFalso({ ordenes: [ULTIMA] })
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1', '2'])
    expect(r.text).toContain('Selecciona el servicio')
    const r2 = await enviar(esc, ['1', '2', '26', 'A1', 'no', 'CONFIRMAR'])
    const payload = api.crearOrdenLlamadas[0]!.payload as {
      detalles: Array<{ servicio: string; cantidad: number; dientes: number[]; colorDiente: string }>
    }
    expect(payload.detalles[0]).toEqual({ servicio: 'Corona zirconio', cantidad: 2, dientes: [26], colorDiente: 'A1' })
  })

  it('respuesta desconocida en la precarga: "No entendí" y la pregunta otra vez', async () => {
    const api = apiFalso({ ordenes: [ULTIMA] })
    const esc = escritor(api)
    await enviar(esc, ['4', '1'])
    const r = await esc.handle(TEL, 'dale')
    expect(r.text).toContain('No entendí')
    expect(r.text).toContain('¿Mismo trabajo y color que tu última orden (Corona zirconio, A2)?')
  })

  it('sin orden previa del doctor la pregunta no aparece', async () => {
    const api = apiFalso({ ordenes: [{ ...ULTIMA, asignacion: { ...ULTIMA.asignacion, doctor: { id: 'doc-otro' } } }] })
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1'])
    expect(r.text).not.toContain('última orden')
    expect(r.text).toContain('Paciente')
  })

  it('sin detalles la pregunta no aparece', async () => {
    const api = apiFalso({ ordenes: [{ ...ULTIMA, detalles: [] }] })
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1'])
    expect(r.text).not.toContain('última orden')
  })

  it('fallo de GET /mi-clinica/ordenes: el flujo sigue normal en silencio', async () => {
    const api = apiFalso({ ordenes: [ULTIMA], getOrdenesError: new ApiError(503, 'caído') })
    const esc = escritor(api)
    const r = await enviar(esc, ['4', '1'])
    expect(r.text).toContain('Paciente de Ana Gómez')
    const r2 = await enviar(esc, ['1', '1', '2', '26 27', 'A1', 'no', 'CONFIRMAR'])
    expect(r2.text).toContain('Orden 1234')
  })

  it('contacto 1:1: la precarga se ofrece igual', async () => {
    const api = apiFalso({ ordenes: [ULTIMA] })
    const esc = escritor(api)
    const r = await esc.handle(TEL, '4', 'doc-1')
    expect(r.text).toBe('¿Mismo trabajo y color que tu última orden (Corona zirconio, A2)? 1 sí / 2 no')
    const r2 = await esc.handle(TEL, '1')
    expect(r2.text).toContain('Paciente de Ana Gómez')
  })
})

describe('idempotencia de la creación (ronda adversarial T6)', () => {
  it('la misma clave de idempotencia se reutiliza en los reintentos de una misma orden', async () => {
    const api = apiFalso({ crearOrdenError: new ApiError(500, 'boom') })
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no', 'CONFIRMAR'])
    api.crearOrdenError = undefined
    const r = await enviar(esc, ['CONFIRMAR'])
    expect(r.text).toContain('Orden 1234')
    expect(api.crearOrdenLlamadas).toHaveLength(2)
    expect(api.crearOrdenLlamadas[0]!.idempotencyKey).toBeTruthy()
    expect(api.crearOrdenLlamadas[1]!.idempotencyKey).toBe(api.crearOrdenLlamadas[0]!.idempotencyKey)
  })

  it('cancelar y empezar una orden nueva produce una clave distinta', async () => {
    const api = apiFalso()
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no', 'CONFIRMAR'])
    const k1 = api.crearOrdenLlamadas[0]!.idempotencyKey
    await enviar(esc, ['0', '4', '1', '1', '1', '2', '26 27', 'A1', 'no', 'CONFIRMAR'])
    expect(api.crearOrdenLlamadas).toHaveLength(2)
    expect(api.crearOrdenLlamadas[1]!.idempotencyKey).toBeTruthy()
    expect(api.crearOrdenLlamadas[1]!.idempotencyKey).not.toBe(k1)
  })

  it('error de red: dice que la orden puede que se haya creado y cómo verificarla', async () => {
    const api = apiFalso({ crearOrdenError: new Error('fetch failed') })
    const store = new ConversationStore()
    const esc = escritor(api, store)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    const r = await esc.handle(TEL, 'CONFIRMAR')
    expect(r.text).toContain('puede que se haya creado')
    expect(r.text).toContain('opción 1')
    expect(store.get(TEL)?.step).toBe('orden-confirmar')
  })

  it('un 5xx también avisa que la orden puede que se haya creado', async () => {
    const api = apiFalso({ crearOrdenError: new ApiError(500, 'boom') })
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    const r = await esc.handle(TEL, 'CONFIRMAR')
    expect(r.text).toContain('puede que se haya creado')
    expect(r.text).toContain('opción 1')
  })

  it('un 400 de validación mantiene el aviso de reintento seguro', async () => {
    const api = apiFalso({ crearOrdenError: new ApiError(400, 'malos datos') })
    const esc = escritor(api)
    await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no'])
    const r = await esc.handle(TEL, 'CONFIRMAR')
    expect(r.text).toContain('No pude crear la orden')
    expect(r.text).not.toContain('puede que se haya creado')
  })

  it('la clave de idempotencia nunca aparece en los registros', async () => {
    const originales: Array<[string, (...a: unknown[]) => void]> = []
    const vistas: unknown[][] = []
    for (const m of ['log', 'warn', 'error'] as const) {
      const o = console[m].bind(console)
      originales.push([m, o])
      console[m] = (...a: unknown[]) => {
        vistas.push(a)
        o(...a)
      }
    }
    try {
      const api = apiFalso({ crearOrdenError: new Error('fetch failed') })
      const esc = escritor(api)
      await enviar(esc, ['4', '1', '1', '1', '2', '26 27', 'A1', 'no', 'CONFIRMAR'])
      const clave = api.crearOrdenLlamadas[0]!.idempotencyKey as string
      expect(clave).toBeTruthy()
      for (const llamada of vistas) {
        expect(JSON.stringify(llamada)).not.toContain(clave)
      }
    } finally {
      for (const [m, o] of originales) {
        ;(console as unknown as Record<string, (...a: unknown[]) => void>)[m] = o
      }
    }
  })
})
