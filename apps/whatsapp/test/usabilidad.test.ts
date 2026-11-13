import { describe, expect, it } from 'bun:test'
import type { ApiClient, DoctorApi, ServicioApi } from '../src/api.js'
import { extraerNumero } from '../src/digitos.js'
import { AVISO_AUDIO, AVISO_MEDIA } from '../src/flows.js'
import { ConversationStore } from '../src/estado.js'
import { ReadFlows, type Respuesta } from '../src/flows.js'
import { OrderFlows } from '../src/write-flows.js'
import { SALUDO } from '../src/mensajes.js'

const TEL = '+573001234567'

const DOCTORES: DoctorApi[] = [{ id: 'doc-1', nombres: 'Ana', apellidos: 'Gómez' }]
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
    getPacientes: async () => [{ id: '7', nombre: 'Luis Pérez', cedula: '1030' }],
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

function texto(r: Respuesta): string {
  return (r as { text: string }).text
}

describe('medios no legibles', () => {
  it('audio sin paso activo: aviso de audio + saludo', async () => {
    const api = apiFalso()
    const { flows } = par(api)
    const r = await flows.media(TEL, true)
    expect(texto(r)).toBe(`${AVISO_AUDIO}\n\n${SALUDO}`)
  })

  it('imagen en un paso de lectura: aviso genérico + la pregunta de ese paso', async () => {
    const api = apiFalso()
    const { flows, store } = par(api)
    await flows.atenderRuta(TEL, { tipo: 'ver_pedido' })
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

  it('audio en un paso de la orden repite la pregunta de ese paso', async () => {
    const api = apiFalso()
    const { flows, esc, store } = par(api)
    await flows.atenderRuta(TEL, { tipo: 'nuevo_pedido', texto: 'nuevo pedido' }, 'doc-1')
    for (const p of ['Luis', 'Corona zirconio']) await esc.handle(TEL, p)
    const r = await flows.media(TEL, true)
    expect(texto(r)).toContain(AVISO_AUDIO)
    expect(texto(r)).toContain('¿Cuántas unidades')
    expect(store.get(TEL)?.step).toBe('orden-cantidad')
  })

  it('imagen en el paso de confirmación re-muestra la pregunta del paso', async () => {
    const api = apiFalso()
    const { flows, esc } = par(api)
    await flows.atenderRuta(TEL, { tipo: 'nuevo_pedido', texto: 'nuevo pedido' }, 'doc-1')
    for (const p of ['Luis', 'Corona zirconio', '2', '26 27', 'A1']) await esc.handle(TEL, p)
    const r = await flows.media(TEL, false)
    expect(texto(r)).toContain(AVISO_MEDIA)
    expect(texto(r)).toContain('Servicio: Corona zirconio')
  })
})

describe('dígitos dentro del texto', () => {
  it('extraerNumero acepta las formas del usuario y rechaza la ambigua', () => {
    expect(extraerNumero('orden 1234')).toBe('1234')
    expect(extraerNumero('#1234')).toBe('1234')
    expect(extraerNumero('la 1234')).toBe('1234')
    expect(extraerNumero('N.º 1234')).toBe('1234')
    expect(extraerNumero('1234')).toBe('1234')
    expect(extraerNumero('26 27')).toBeNull()
    expect(extraerNumero('hola')).toBeNull()
  })

  it('"orden 1234" resuelve la orden por la ruta de pedido', async () => {
    const api = apiFalso()
    let ordenPedida = ''
    ;(api as unknown as Record<string, unknown>).getOrden = async (_t: string, id: string) => {
      ordenPedida = id
      return { id, estado: { nombre: 'Producción' }, fechaEntrega: null, detalles: [] }
    }
    const { flows } = par(api)
    const r = await flows.atenderRuta(TEL, { tipo: 'ver_pedido', numero: '1234' })
    expect(ordenPedida).toBe('1234')
    expect(texto(r)).toContain('Estado:')
  })

  it('"la 1234" resuelve la cuenta de cobro por la ruta de cuenta', async () => {
    const api = apiFalso()
    let cuentaPedida = ''
    ;(api as unknown as Record<string, unknown>).getCuentaCobro = async (_t: string, id: string) => {
      cuentaPedida = id
      return { numero: 'CC-1', pdfUrl: null }
    }
    const { flows } = par(api)
    await flows.atenderRuta(TEL, { tipo: 'enviar_cuenta', numero: '1234' })
    expect(cuentaPedida).toBe('1234')
  })

  it('el color (texto libre) nunca extrae dígitos: A2 se guarda tal cual', async () => {
    const api = apiFalso()
    const { esc, flows } = par(api)
    await flows.atenderRuta(TEL, { tipo: 'nuevo_pedido', texto: 'nuevo pedido' }, 'doc-1')
    for (const p of ['Luis', 'Corona zirconio', '2', '26']) await esc.handle(TEL, p)
    const r = texto(await esc.handle(TEL, 'A2'))
    expect(r).toContain('Color: A2')
  })
})
