import { describe, expect, it } from 'bun:test'
import type { ActualizarOrdenPayload, ApiClient, OrdenApi } from '../src/api.js'
import { preguntaCual } from '../src/orden-existente.js'
import { ReadFlows } from '../src/flows.js'
import { ClienteGroq, StoreLlm, prechequeoRuta, type Ruta } from '../src/llm.js'
import { OrdenExistenteFlows, PASO_CAMBIO, CONFIRMAR_CAMBIO, sinAvance } from '../src/orden-existente.js'
import { clasificarNegativa, construirPromptSistema } from '../src/prompt.js'
import { HERRAMIENTAS } from '../src/herramientas.js'
import { ConversationStore } from '../src/state.js'
import { resolverDiaReferencia } from '../src/tiempo.js'

const TEL = '+573001234567'
/** Miércoles 11 de junio de 2025, 10:00 en Bogotá. */
const AHORA = new Date('2025-06-11T15:00:00.000Z')

const SARA: OrdenApi = {
  id: '18',
  estado: { codigo: 'creada', nombre: 'Creada' },
  fechaCreacion: '2025-06-10T15:00:00.000Z',
  fechaEntrega: '2025-06-13T12:00:00.000Z',
  asignacion: { paciente: { nombre: 'Sara Jiménez' }, doctor: { nombres: 'Ana', apellidos: 'Gómez' } },
  detalles: [{ servicio: 'Protesis', cantidad: 2, dientes: [41, 42], colorDiente: 'A2', observaciones: null }],
}

const SARA_EN_PROCESO: OrdenApi = {
  ...SARA,
  id: '12',
  estado: { codigo: 'en_proceso', nombre: 'En producción' },
  fechaCreacion: '2025-06-10T20:00:00.000Z',
  fechaEntrega: '2025-06-16T12:00:00.000Z',
}

/** Otra orden de Sara, también editable: la elección es por su fecha de entrega. */
const SARA_TARDE: OrdenApi = {
  ...SARA,
  id: '19',
  fechaEntrega: '2025-06-20T12:00:00.000Z',
}

const LUIS: OrdenApi = {
  ...SARA,
  id: '20',
  estado: { codigo: 'creada', nombre: 'Creada' },
  fechaCreacion: '2025-06-10T16:00:00.000Z',
  asignacion: { paciente: { nombre: 'Luis Pérez' } },
  detalles: [{ servicio: 'Corona', cantidad: 1, dientes: [11], colorDiente: 'A1' }],
}

interface Escenario {
  puts: Array<{ id: string; payload: ActualizarOrdenPayload }>
  flows: ReadFlows
  existente: OrdenExistenteFlows
  store: ConversationStore
}

function montar(ordenes: OrdenApi[], ahora = AHORA): Escenario {
  const puts: Escenario['puts'] = []
  const api = {
    getOrdenes: async () => ordenes,
    actualizarOrden: async (_t: string, id: string, payload: ActualizarOrdenPayload) => {
      puts.push({ id, payload })
      return ordenes.find((o) => o.id === id)!
    },
    registrarIntencion: async () => {},
  } as unknown as ApiClient
  const store = new ConversationStore()
  const existente = new OrdenExistenteFlows(store, api, () => ahora)
  const flows = new ReadFlows(store, api, undefined, undefined, existente)
  return { puts, flows, existente, store }
}

/** Un turno como en producción: prechequeo de ruta, y el flujo determinista ejecuta. */
async function turno(flows: ReadFlows, texto: string): Promise<string> {
  const ruta: Ruta | null = prechequeoRuta(texto)
  const respuesta = ruta ? await flows.atenderRuta(TEL, { ...ruta, texto }) : await flows.handle(TEL, texto)
  return respuesta.text
}

async function conversar(flows: ReadFlows, textos: string[]): Promise<string[]> {
  const respuestas: string[] = []
  for (const texto of textos) respuestas.push(await turno(flows, texto))
  return respuestas
}

describe('S2/S3 · la orden de un paciente se corrige hablando', () => {
  it('"en la orden de Sara Jimenez ya no vamos a hacer el diente 42" → antes→después, y escribe solo con el sí', async () => {
    const { flows, puts } = montar([SARA])
    const mensaje = 'en la orden de Sara Jimenez ya no vamos a hacer el diente 42'

    // La ruta la elige el modelo; el prechequeo la reconoce sin una sola llamada.
    expect(prechequeoRuta(mensaje)?.tipo).toBe('editar_orden')

    const [propuesta] = await conversar(flows, [mensaje])
    expect(propuesta).toContain('Orden 18')
    expect(propuesta).toContain('Sara Jiménez')
    expect(propuesta).toContain('Antes: Protesis, 2 unidades, dientes 41 42, color A2')
    expect(propuesta).toContain('Después: Protesis, 2 unidades, dientes 41, color A2')
    expect(propuesta).toContain(CONFIRMAR_CAMBIO)
    // Nada se escribe antes de la confirmación literal.
    expect(puts).toEqual([])

    const [listo] = await conversar(flows, ['sí'])
    expect(listo).toContain('Listo. La orden 18 de Sara Jiménez quedó así:')
    expect(puts).toHaveLength(1)
    expect(puts[0]!.id).toBe('18')
    expect(puts[0]!.payload).toEqual({
      detalles: [{ servicio: 'Protesis', cantidad: 2, dientes: [41], colorDiente: 'A2' }],
    })
  })

  it('una sola frase con paciente, dientes y color no vuelve a preguntar nada', async () => {
    const { flows, puts } = montar([SARA])
    const [propuesta] = await conversar(flows, ['quita el 41 y déjala en color A1 en la orden de Sara Jimenez'])
    expect(propuesta).toContain('Después: Protesis, 2 unidades, dientes 42, color A1')
    expect(propuesta).not.toContain('¿De qué color')
    expect(propuesta).not.toContain('¿En qué dientes')
    expect(propuesta).toContain(CONFIRMAR_CAMBIO)
    expect(puts).toEqual([])
  })

  it('una orden en estado que no admite cambios lo dice y no escribe', async () => {
    const { flows, puts } = montar([SARA_EN_PROCESO])
    const [respuesta] = await conversar(flows, ['quita el 42 de la orden de Sara Jimenez'])
    expect(respuesta).toContain('está en En producción, así que ya no se puede cambiar')
    expect(respuesta).toContain('escríbele al laboratorio')
    expect(respuesta).not.toContain('Antes:')
    expect(puts).toEqual([])
  })
})

describe('S2 · varias órdenes del mismo paciente', () => {
  it('pregunta cuál por estado y fecha, sin listas numeradas', async () => {
    const { flows } = montar([SARA, SARA_EN_PROCESO])
    const [pregunta] = await conversar(flows, ['quita el 42 de la orden de Sara Jimenez'])
    expect(pregunta).toContain('Encontré 2 órdenes de Sara Jiménez')
    expect(pregunta).toContain('en producción')
    expect(pregunta).toContain('creada')
    expect(pregunta).toContain('entrega el')
    expect(pregunta).toContain('¿Cuál es?')
    expect(pregunta).not.toMatch(/(^|\n)\s*\d+[.)]\s/)
  })

  it('la persona elige por el estado y el bot la reconoce', async () => {
    const { flows, puts } = montar([SARA, SARA_EN_PROCESO])
    const [, elegida] = await conversar(flows, [
      'quita el 42 de la orden de Sara Jimenez',
      'la que está en producción',
    ])
    // La eligió, y como esa orden ya no admite cambios, lo dice sin escribir.
    expect(elegida).toContain('La orden 12 de Sara Jiménez está en En producción')
    expect(puts).toEqual([])
  })

  it('la persona elige por la fecha de entrega y sigue con el cambio', async () => {
    const { flows, puts } = montar([SARA, SARA_TARDE])
    const [, propuesta] = await conversar(flows, [
      'quita el 42 de la orden de Sara Jimenez',
      'la que se entrega el 20 de junio',
    ])
    expect(propuesta).toContain('Orden 19')
    expect(propuesta).toContain('Antes: Protesis, 2 unidades, dientes 41 42, color A2')
    expect(propuesta).toContain('Después: Protesis, 2 unidades, dientes 41, color A2')
    expect(puts).toEqual([])
  })

  it('un paciente sin órdenes se dice, sin inventar ninguna', async () => {
    const { flows } = montar([SARA, LUIS])
    const [respuesta] = await conversar(flows, ['la orden de Pedro Nadie'])
    expect(respuesta).toContain('No encontré órdenes de Pedro Nadie en tu clínica.')
    expect(respuesta).not.toContain('Orden 1')
    expect(respuesta).toContain('Por ejemplo')
  })
})

describe('S3 · quitar un diente no es borrar la orden', () => {
  it('"elimina el diente" llega al cambio y "borra la orden" sigue siendo negativa', () => {
    expect(clasificarNegativa('elimina el diente 42 de la orden de Sara Jimenez')).toBeNull()
    expect(prechequeoRuta('elimina el diente 42 de la orden de Sara Jimenez')?.tipo).toBe('editar_orden')
    expect(clasificarNegativa('borra la orden 1234')).toBe('escritura')
  })
})

describe('S7 · los datos que ve el modelo llevan la fecha de creación', () => {
  it('las herramientas de orden exponen fecha_creacion', () => {
    expect(HERRAMIENTAS.estado_orden.sql).toContain('o.fecha_creacion')
    expect(HERRAMIENTAS.ultima_orden_doctor.sql).toContain('o.fecha_creacion')
  })
})

describe('S6 · por número, por paciente o por los dos', () => {
  it('"la orden 18", "la orden de Sara" y "la orden 18 de Sara" llegan a la misma orden', async () => {
    for (const mensaje of ['la orden 18', 'la orden de Sara', 'la orden 18 de Sara']) {
      const { flows } = montar([SARA])
      const [respuesta] = await conversar(flows, [mensaje])
      expect(respuesta).toContain('Orden 18')
      expect(respuesta).toContain('Estado: Creada')
    }
  })

  it('número y nombre que no coinciden: dice la discrepancia y no escribe', async () => {
    const { flows, puts } = montar([SARA])
    const [respuesta] = await conversar(flows, ['quita el 42 de la orden 18 de Pedro Nadie'])
    expect(respuesta).toContain('la orden 18 es de Sara Jiménez, no de Pedro Nadie')
    expect(respuesta).toContain('No la toco hasta que me digas cuál')
    expect(puts).toEqual([])
  })
})

describe('S7 · fechas relativas contra la fecha del laboratorio', () => {
  it('el martes se resuelve contra el miércoles 11 de junio', () => {
    expect(resolverDiaReferencia('la orden que te hice el martes', AHORA)).toBe('2025-06-10')
    expect(resolverDiaReferencia('el pedido de ayer', AHORA)).toBe('2025-06-10')
    expect(resolverDiaReferencia('la de hoy', AHORA)).toBe('2025-06-11')
    expect(resolverDiaReferencia('la orden de Sara', AHORA)).toBeNull()
  })

  it('varias órdenes de ese día: una por línea, con paciente y estado, sin numerar', async () => {
    const { flows } = montar([SARA, LUIS])
    const [respuesta] = await conversar(flows, ['¿qué pasó con la orden que te hice el martes?'])
    expect(respuesta).toContain('El martes 10 de junio de 2025 hiciste varias órdenes:')
    expect(respuesta).toContain('Sara Jiménez, creada')
    expect(respuesta).toContain('Luis Pérez, creada')
    expect(respuesta).not.toMatch(/(^|\n)\s*\d+[.)]\s/)
    expect(respuesta).toContain('Dime el paciente, el número o el estado')
  })

  it('una sola orden de ese día se responde directo', async () => {
    const { flows } = montar([SARA])
    const [respuesta] = await conversar(flows, ['el pedido del martes, ¿qué pasó con él?'])
    expect(respuesta).toContain('Orden 18')
    expect(respuesta).toContain('Estado: Creada')
  })

  it('el prompt del sistema lleva la fecha de hoy y la zona del laboratorio, calculadas en código', async () => {
    const prompt = construirPromptSistema(undefined, AHORA)
    expect(prompt).toContain('Hoy es miércoles 11 de junio de 2025')
    expect(prompt).toContain('America/Bogota')

    // El modelo recibe esa fecha: no la inventa. Se comprueba con el reloj inyectado.
    const cuerpos: string[] = []
    const fetchFalso = (async (_url: unknown, init?: { body?: unknown }) => {
      cuerpos.push(String(init?.body ?? ''))
      return new Response(JSON.stringify({ choices: [{ message: { content: 'hola' } }], usage: {} }), { status: 200 })
    }) as unknown as typeof fetch
    const cliente = new ClienteGroq({ apiKey: 'gsk', modelo: 'm', timeoutMs: 50, nombre: 'Aioniq' }, fetchFalso)
    await cliente.manejar('tel', 'hola', { disponible: () => false } as never, '42', new StoreLlm(), AHORA.getTime())
    expect(cuerpos[0]).toContain('11 de junio de 2025')
    expect(cuerpos[0]).toContain('America/Bogota')
  })
})

describe('S5 · sin salida no hay: siempre lo entendido y un ejemplo', () => {
  it('un mensaje sin orden ni cambio dice qué sí se entiende con un ejemplo', async () => {
    const { existente } = montar([SARA])
    const { text } = await existente.handle(TEL, 'hola, qué tal')
    expect(text).not.toBe('No entendí')
    expect(text).not.toContain('No entendí')
    expect(text).toContain('Puedo buscar una orden')
    expect(text).toContain('Por ejemplo')
    expect(text).not.toMatch(/(^|\n)\s*\d+[.)]\s/)
  })

  it('sinAvance nunca es "No entendí" a secas', () => {
    const texto = sinAvance('No encontré la orden 99 en tus órdenes.')
    expect(texto).toContain('No encontré la orden 99')
    expect(texto).toContain('Por ejemplo')
    expect(texto).not.toBe('No entendí')
  })

  it('un diente que la orden no tiene se dice con ejemplo, sin escribir', async () => {
    const { flows, puts } = montar([SARA])
    const [respuesta] = await conversar(flows, ['quita el 26 de la orden de Sara Jimenez'])
    expect(respuesta).toContain('La orden 18 no tiene el diente 26.')
    expect(respuesta).toContain('Por ejemplo')
    expect(puts).toEqual([])
  })
})

describe('C3/S4 · cada turno reinterpreta el mensaje completo contra el borrador', () => {
  it('lo ya dicho sobrevive al turno siguiente', async () => {
    const { flows, store } = montar([SARA])
    await conversar(flows, ['quita el 42 de la orden de Sara Jimenez'])
    expect(store.get(TEL)?.step).toBe(PASO_CAMBIO)
    expect(store.get(TEL)?.fields.quitar).toBe('42')
    const [antes] = await conversar(flows, ['mejor agrega el 43'])
    expect(antes).toContain('dientes 41 43')
    expect(antes).toContain('Voy a cambiar')
  })
})

describe('cuando dos pacientes se llaman igual (S6)', () => {
  it('la pregunta ofrece el número de cada orden, para no quedar en bucle', () => {
    const ordenes = [
      { id: '12', estado: { nombre: 'Creada' }, fechaEntrega: null, fechaCreacion: '2026-06-10T14:00:00Z' },
      { id: '18', estado: { nombre: 'Creada' }, fechaEntrega: null, fechaCreacion: '2026-06-10T15:00:00Z' },
    ] as unknown as Parameters<typeof preguntaCual>[0]
    const texto = preguntaCual(ordenes)
    expect(texto).toContain('la 12')
    expect(texto).toContain('la 18')
    expect(texto).not.toMatch(/^\s*\d+[.)]/m)
  })
})
