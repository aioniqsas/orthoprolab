import { describe, expect, it } from 'bun:test'
import type { ApiClient, DoctorApi, ServicioApi } from '../src/api.js'
import { extraerNumero } from '../src/digitos.js'
import { AVISO_AUDIO, AVISO_MEDIA, PREGUNTA_AYUDA, PREGUNTA_CONFIRMAR } from '../src/flows.js'
import { buildMenu } from '../src/menu.js'
import { ConversationStore } from '../src/state.js'
import { ReadFlows, type Respuesta } from '../src/flows.js'
import { OrderFlows } from '../src/write-flows.js'

const TEL = '+573001234567'

const DOCTORES: DoctorApi[] = [{ id: 'doc-1', nombres: 'Ana', apellidos: 'Gómez' }]
const PACIENTES = [{ id: '1', paciente: { id: '7', nombre: 'Luis Pérez', cedula: '1030' } }]
const SERVICIOS: ServicioApi[] = [{ id: 's1', nombre: 'Corona zirconio' }]

interface ApiFalso extends ApiClient {
  llamadasLlamada: number
  crearOrdenLlamadas: unknown[]
}

function apiFalso(): ApiFalso {
  const api: ApiFalso = {
    llamadasLlamada: 0,
    crearOrdenLlamadas: [],
    getDoctores: async () => DOCTORES,
    getPacientes: async () => PACIENTES.map((f) => f.paciente),
    getServicios: async () => SERVICIOS,
    crearOrden: async (_t: string, _p: unknown, _k?: string) => {
      api.crearOrdenLlamadas.push({})
      return { id: '1234', estado: { nombre: 'Creada' }, fechaEntrega: null, detalles: [] }
    },
    solicitarLlamada: async () => {
      api.llamadasLlamada += 1
    },
    registrarIntencion: async () => {},
  } as unknown as ApiFalso
  return api
}

function par(apiFalsoInst: ApiFalso): { flows: ReadFlows; esc: OrderFlows; store: ConversationStore } {
  const store = new ConversationStore()
  const esc = new OrderFlows(store, apiFalsoInst)
  const flows = new ReadFlows(store, apiFalsoInst, esc)
  return { flows, esc, store }
}

function texto(r: Respuesta): string {
  return (r as { text: string }).text
}

describe('0 = volver al menú en todos los flujos (S11/T12)', () => {
  it('en el menú, 0 ya no llama: muestra el menú', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.handle(TEL, '0')
    expect(texto(r)).toBe(buildMenu())
    expect(api.llamadasLlamada).toBe(0)
  })

  it('en cada paso de lectura, 0 devuelve al menú', async () => {
    for (const opcion of ['1', '2', '3']) {
      const api = apiFalso()
      const { flows, store } = par(api)
      await flows.handle(TEL, opcion)
      expect(store.get(TEL)).toBeDefined()
      const r = await flows.handle(TEL, '0')
      expect(texto(r)).toContain('De vuelta al menú')
      expect(store.get(TEL)).toBeUndefined()
    }
  })

  it('en el flujo de orden, 0 en cada paso devuelve al menú y descarta', async () => {
    for (const pasos of [['4'], ['4', '1'], ['4', '1', '1'], ['4', '1', '1', '1'], ['4', '1', '1', '1', '2'], ['4', '1', '1', '1', '2', '26 27'], ['4', '1', '1', '1', '2', '26 27', 'A1']]) {
      const api = apiFalso()
      const { flows, esc, store } = par(api)
      for (const p of pasos) await esc.handle(TEL, p)
      const r = await flows.handle(TEL, '0')
      expect(texto(r)).toContain('De vuelta al menú')
      expect(store.get(TEL)).toBeUndefined()
      expect(api.crearOrdenLlamadas).toHaveLength(0)
    }
  })
})

describe('"ayuda" pregunta antes de llamar (S11/T12)', () => {
  it('replica la pregunta y NO llama al endpoint', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.handle(TEL, 'ayuda')
    expect(texto(r)).toBe(PREGUNTA_AYUDA)
    expect(api.llamadasLlamada).toBe(0)
    expect(r.intencion).toBe('llamada')
  })

  it('1 confirma y recién ahí llama al endpoint', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    await flows.handle(TEL, 'help')
    const r = await flows.handle(TEL, '1')
    expect(api.llamadasLlamada).toBe(1)
    expect(texto(r)).toContain('te llamaremos')
  })

  it('0 vuelve al menú sin llamar', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    await flows.handle(TEL, 'ayuda')
    const r = await flows.handle(TEL, '0')
    expect(api.llamadasLlamada).toBe(0)
    expect(texto(r)).toBe(buildMenu())
  })

  it('respuesta desconocida: "No entendí" y la pregunta otra vez', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    await flows.handle(TEL, 'ayuda')
    const r = await flows.handle(TEL, 'tal vez')
    expect(api.llamadasLlamada).toBe(0)
    expect(texto(r)).toBe(`No entendí. ${PREGUNTA_AYUDA}`)
  })

  it('"ayuda" en medio del flujo de orden pregunta y 0 regresa al paso del pedido', async () => {
    const api = apiFalso()
    const { flows, esc, store } = par(api)
    await esc.handle(TEL, '4')
    const r1 = await flows.handle(TEL, 'ayuda')
    expect(texto(r1)).toBe(PREGUNTA_AYUDA)
    const r2 = await flows.handle(TEL, '0')
    expect(texto(r2)).toContain('Selecciona el doctor')
    expect(store.get(TEL)?.step).toBe('orden-doctor')
    expect(api.llamadasLlamada).toBe(0)
  })
})

describe('medios no legibles (S11/T12)', () => {
  it('audio en el menú: aviso de audio + menú; el estado no cambia', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.media(TEL, true)
    expect(texto(r)).toBe(`${AVISO_AUDIO}\n\n${buildMenu()}`)
  })

  it('imagen en un paso de lectura: aviso genérico + la pregunta de ese paso', async () => {
    const api = apiFalso()
    const { flows, store } = par(api)
    await flows.handle(TEL, '1')
    const r = await flows.media(TEL, false)
    expect(texto(r)).toContain(AVISO_MEDIA)
    expect(texto(r)).toContain('Escribe el número de la orden')
    expect(store.get(TEL)?.step).toBe('pedido-numero')
  })

  it('sticker/video/documento no son audio', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.media(TEL, false)
    expect(texto(r)).toContain(AVISO_MEDIA)
    expect(texto(r)).not.toContain('audios')
  })

  it('audio en un paso de la orden repite la pregunta de ese paso, no el menú', async () => {
    const api = apiFalso()
    const { flows, esc, store } = par(api)
    for (const p of ['4', '1', '1', '1']) await esc.handle(TEL, p)
    const r = await flows.media(TEL, true)
    expect(texto(r)).toContain(AVISO_AUDIO)
    expect(texto(r)).toContain('¿Cuántas unidades?')
    expect(texto(r)).not.toBe(buildMenu())
    expect(store.get(TEL)?.step).toBe('orden-cantidad')
  })

  it('imagen en el paso de confirmación re-muestra el resumen (la pregunta del paso)', async () => {
    const api = apiFalso()
    const { flows, esc } = par(api)
    for (const p of ['4', '1', '1', '1', '2', '26 27', 'A1', 'no']) await esc.handle(TEL, p)
    const r = await flows.media(TEL, false)
    expect(texto(r)).toContain(AVISO_MEDIA)
    expect(texto(r)).toContain('Servicio: Corona zirconio')
  })
})

describe('"Paso X de Y" (S11/T12)', () => {
  it('sin doctor 1:1: siete preguntas, contadas de 1 a 7', async () => {
    const api = apiFalso()
    const { esc } = par(api)
    // La pregunta del paso N es la respuesta al mensaje que lo antecede.
    expect(texto(await esc.handle(TEL, '4'))).toContain('Paso 1 de 7.') // doctor
    expect(texto(await esc.handle(TEL, '1'))).toContain('Paso 2 de 7.') // paciente
    expect(texto(await esc.handle(TEL, '1'))).toContain('Paso 3 de 7.') // servicio
    expect(texto(await esc.handle(TEL, '1'))).toContain('Paso 4 de 7.') // cantidad
    expect(texto(await esc.handle(TEL, '2'))).toContain('Paso 5 de 7.') // dientes
    expect(texto(await esc.handle(TEL, '26'))).toContain('Paso 6 de 7.') // color
    expect(texto(await esc.handle(TEL, 'A1'))).toContain('Paso 7 de 7.') // observaciones
    expect(texto(await esc.handle(TEL, 'no'))).not.toContain('Paso')
    expect(texto(await esc.handle(TEL, '1'))).toContain('Orden 1234')
  })

  it('con doctor 1:1: seis preguntas, el paso del doctor desaparece', async () => {
    const api = apiFalso()
    const { esc } = par(api)
    expect(texto(await esc.handle(TEL, '4', 'doc-1'))).toContain('Paso 1 de 6.') // paciente
    expect(texto(await esc.handle(TEL, '1'))).toContain('Paso 2 de 6.') // servicio
    expect(texto(await esc.handle(TEL, '1'))).toContain('Paso 3 de 6.') // cantidad
    expect(texto(await esc.handle(TEL, '2'))).toContain('Paso 4 de 6.') // dientes
    expect(texto(await esc.handle(TEL, '26'))).toContain('Paso 5 de 6.') // color
    expect(texto(await esc.handle(TEL, 'A1'))).toContain('Paso 6 de 6.') // observaciones
    expect(texto(await esc.handle(TEL, 'no'))).not.toContain('Paso')
    expect(texto(await esc.handle(TEL, '1'))).toContain('Orden 1234')
  })
})

describe('dígitos dentro del texto (S11/T12)', () => {
  it('extraerNumero acepta las formas del usuario y rechaza la ambigua', () => {
    expect(extraerNumero('orden 1234')).toBe('1234')
    expect(extraerNumero('#1234')).toBe('1234')
    expect(extraerNumero('la 1234')).toBe('1234')
    expect(extraerNumero('N.º 1234')).toBe('1234')
    expect(extraerNumero('1234')).toBe('1234')
    expect(extraerNumero('26 27')).toBeNull()
    expect(extraerNumero('hola')).toBeNull()
  })

  it('"orden 1234" resuelve la orden en el flujo de estado', async () => {
    const api = apiFalso()
    let ordenPedida = ''
    ;(api as unknown as Record<string, unknown>).getOrden = async (_t: string, id: string) => {
      ordenPedida = id
      return { id, estado: { nombre: 'Producción' }, fechaEntrega: null, detalles: [] }
    }
    const { flows } = par(api)
    await flows.handle(TEL, '1')
    const r = await flows.handle(TEL, 'orden #1234')
    expect(ordenPedida).toBe('1234')
    expect(texto(r)).toContain('Estado:')
  })

  it('"la 1234" también resuelve la cuenta de cobro', async () => {
    const api = apiFalso()
    let cuentaPedida = ''
    ;(api as unknown as Record<string, unknown>).getCuentaCobro = async (_t: string, id: string) => {
      cuentaPedida = id
      return { numero: 'CC-1', pdfUrl: null }
    }
    const { flows } = par(api)
    await flows.handle(TEL, '3')
    await flows.handle(TEL, 'la 1234')
    expect(cuentaPedida).toBe('1234')
  })

  it('el color (texto libre) nunca extrae dígitos: A2 se guarda tal cual', async () => {
    const api = apiFalso()
    const { esc } = par(api)
    for (const p of ['4', '1', '1', '1', '2', '26']) await esc.handle(TEL, p)
    await esc.handle(TEL, 'A2')
    const r = texto(await esc.handle(TEL, 'no'))
    expect(r).toContain('Color: A2')
  })
})
