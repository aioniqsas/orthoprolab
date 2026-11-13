import { describe, expect, it } from 'bun:test'
import type { ApiClient, DoctorApi, ServicioApi } from '../src/api.js'
import { extraerNumero } from '../src/digitos.js'
import { AVISO_AUDIO, AVISO_MEDIA, PREGUNTA_AYUDA, PREGUNTA_CONFIRMAR } from '../src/flows.js'
import { CONFIRMAR_PIE, PREGUNTA_CANTIDAD, PREGUNTA_DOCTOR, PREGUNTA_SERVICIO } from '../src/write-flows.js'
import { buildMenu, SALUDO } from '../src/menu.js'
import { ConversationStore } from '../src/state.js'
import { ReadFlows, type Respuesta } from '../src/flows.js'
import { OrderFlows } from '../src/write-flows.js'

const TEL = '+573001234567'

const DOCTORES: DoctorApi[] = [{ id: 'doc-1', nombres: 'Ana', apellidos: 'Gómez' }]
const PACIENTES = [{ id: '1', paciente: { id: '7', nombre: 'Luis Pérez', cedula: '1030' } }]
const SERVICIOS: ServicioApi[] = [{ id: 's1', nombre: 'Corona zirconio' }]

interface ApiFalso extends ApiClient {
  llamadasLlamada: number
  crearOrdenLlamadas: Array<{ payload: unknown }>
}

function apiFalso(): ApiFalso {
  const api: ApiFalso = {
    llamadasLlamada: 0,
    crearOrdenLlamadas: [],
    getDoctores: async () => DOCTORES,
    getPacientes: async () => PACIENTES.map((f) => f.paciente),
    getServicios: async () => SERVICIOS,
    getOrdenes: async () => [],
    crearOrden: async (_t: string, payload: unknown, _k?: string) => {
      api.crearOrdenLlamadas.push({ payload })
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

async function enviar(esc: OrderFlows, textos: string[]): Promise<{ text: string }> {
  let r: { text: string } = { text: '' }
  for (const t of textos) r = (await esc.handle(TEL, t)) as { text: string }
  return r
}

function texto(r: Respuesta): string {
  return (r as { text: string }).text
}

describe('0 = volver al menú en todos los flujos (S11/T12)', () => {
  it('en el menú, 0 ya no llama: muestra el saludo (IA7)', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.handle(TEL, '0')
    expect(texto(r)).toBe(SALUDO)
    expect(api.llamadasLlamada).toBe(0)
  })

  it('en cada paso de lectura, 0 devuelve al menú', async () => {
    for (const opcion of ['1', '2', '3']) {
      const api = apiFalso()
      const { flows, store } = par(api)
      await flows.handle(TEL, opcion)
      expect(store.get(TEL)).toBeDefined()
      const r = await flows.handle(TEL, '0')
      expect(texto(r)).toBe(SALUDO)
      expect(store.get(TEL)).toBeUndefined()
    }
  })

  it('en el flujo de orden, 0 en cada paso devuelve al menú y descarta', async () => {
    for (const pasos of [['4'], ['4', 'Ana'], ['4', 'Ana', 'Luis'], ['4', 'Ana', 'Luis', 'Corona zirconio'], ['4', 'Ana', 'Luis', 'Corona zirconio', '2'], ['4', 'Ana', 'Luis', 'Corona zirconio', '2', '26 27'], ['4', 'Ana', 'Luis', 'Corona zirconio', '2', '26 27', 'A1']]) {
      const api = apiFalso()
      const { flows, esc, store } = par(api)
      for (const p of pasos) await esc.handle(TEL, p)
      const r = await flows.handle(TEL, '0')
      expect(texto(r)).toBe(SALUDO)
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
    expect(texto(r)).toBe(SALUDO)
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
    expect(texto(r2)).toBe(PREGUNTA_DOCTOR)
    expect(store.get(TEL)?.step).toBe('orden-doctor')
    expect(api.llamadasLlamada).toBe(0)
  })
  it('"ayuda" en medio del flujo de orden pregunta y 0 regresa al paso del pedido', async () => {
    const api = apiFalso()
    const { flows, esc, store } = par(api)
    await esc.handle(TEL, '4')
    const r1 = await flows.handle(TEL, 'ayuda')
    expect(texto(r1)).toBe(PREGUNTA_AYUDA)
    const r2 = await flows.handle(TEL, '0')
    expect(texto(r2)).toBe(PREGUNTA_DOCTOR)
    expect(store.get(TEL)?.step).toBe('orden-doctor')
    expect(api.llamadasLlamada).toBe(0)
  })

  it('"ayuda" → 1 en medio del flujo: registra la llamada y retoma el paso con las respuestas intactas', async () => {
    const api = apiFalso()
    const { flows, esc, store } = par(api)
    // Servicio y cantidad ya respondidos: quedan en el borrador.
    for (const p of ['4', 'Ana', 'Luis', 'Corona zirconio', '3']) await esc.handle(TEL, p)
    expect(store.get(TEL)?.step).toBe('orden-dientes')
    expect(store.get(TEL)?.fields.servicioNombre).toBe('Corona zirconio')
    expect(store.get(TEL)?.fields.cantidad).toBe('3')
    const r = await flows.handle(TEL, 'ayuda')
    expect(texto(r)).toBe(PREGUNTA_AYUDA)
    expect(api.llamadasLlamada).toBe(0)
    const r2 = await flows.handle(TEL, '1')
    expect(api.llamadasLlamada).toBe(1)
    // Retoma en dientes con el borrador intacto.
    expect(texto(r2)).toContain('dientes')
    expect(store.get(TEL)?.step).toBe('orden-dientes')
    expect(store.get(TEL)?.fields.servicioNombre).toBe('Corona zirconio')
    expect(store.get(TEL)?.fields.cantidad).toBe('3')
    const r3 = await enviar(esc, ['26', 'A1', 'CONFIRMAR'])
    const payload = api.crearOrdenLlamadas[0]!.payload as { detalles: Array<{ cantidad: number }> }
    expect(payload.detalles[0]!.cantidad).toBe(3)
    expect((r3 as unknown as Respuesta).text).toContain('Orden 1234')
  })
})

describe('medios no legibles (S11/T12)', () => {
  it('audio en el menú: aviso de audio + saludo; el estado no cambia (IA7)', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.media(TEL, true)
    expect(texto(r)).toBe(`${AVISO_AUDIO}\n\n${SALUDO}`)
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
    for (const p of ['4', 'Ana', 'Luis', 'Corona zirconio']) await esc.handle(TEL, p)
    const r = await flows.media(TEL, true)
    expect(texto(r)).toContain(AVISO_AUDIO)
    expect(texto(r)).toContain('¿Cuántas unidades')
    expect(texto(r)).not.toBe(buildMenu())
    expect(store.get(TEL)?.step).toBe('orden-cantidad')
  })

  it('imagen en el paso de confirmación re-muestra el resumen (la pregunta del paso)', async () => {
    const api = apiFalso()
    const { flows, esc } = par(api)
    for (const p of ['4', 'Ana', 'Luis', 'Corona zirconio', '2', '26 27', 'A1']) await esc.handle(TEL, p)
    const r = await flows.media(TEL, false)
    expect(texto(r)).toContain(AVISO_MEDIA)
    expect(texto(r)).toContain('Servicio: Corona zirconio')
  })
})

describe('conversación sin pasos y sin listas (S7, S8)', () => {
  const respuestas: string[] = []

  it('la conversación pregunta por nombre, en una pregunta por turno, sin pasos ni listas', async () => {
    const api = apiFalso()
    const { esc, store } = par(api)
    const pasos = ['4', 'Ana', 'Luis', 'Corona zirconio', '2', '26', 'A1', 'sí']
    let r = { text: '' }
    for (const p of pasos) {
      r = { text: '' }
      const out = await esc.handle(TEL, p)
      respuestas.push((out as { text: string }).text)
    }
    void r; void store
    const textos = respuestas.filter((t) => t !== '')
    expect(textos[0]).toBe(PREGUNTA_DOCTOR)
    expect(textos[1]).toBe('¿Cómo se llama el paciente?')
    expect(textos[2]).toBe(PREGUNTA_SERVICIO)
    expect(textos[3]).toBe(PREGUNTA_CANTIDAD)
    expect(textos[4]).toContain('dientes')
    expect(textos[5]).toContain('color')
    expect(textos[6]).toContain('Nueva orden:')
    expect(textos[6]).toContain(CONFIRMAR_PIE)
    expect(textos[7]).toContain('Orden 1234')
    for (const t of textos) {
      expect(t).not.toMatch(/Paso \d/)
      expect(t).not.toMatch(/^\s*\d+[.)]/m)
      expect(t).not.toMatch(/escribe el número/i)
      expect(t).not.toMatch(/selecciona/i)
    }
  })

  it('con doctor 1:1 el doctor nunca se pregunta', async () => {
    const api = apiFalso()
    const { esc } = par(api)
    const r = await esc.handle(TEL, '4', 'doc-1')
    expect(r.text).not.toContain(PREGUNTA_DOCTOR)
    expect(r.text).not.toMatch(/Paso \d/)
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
    for (const p of ['4', 'Ana', 'Luis', 'Corona zirconio', '2', '26']) await esc.handle(TEL, p)
    const r = texto(await esc.handle(TEL, 'A2'))
    expect(r).toContain('Color: A2')
  })
})
