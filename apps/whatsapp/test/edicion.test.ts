import { describe, expect, it } from 'bun:test'
import { ApiError, type ActualizarOrdenPayload, type ApiClient, type OrdenApi } from '../src/api.js'
import { AYUDA_CAMBIAR, OrdenExistenteFlows, esEditable } from '../src/orden-existente.js'
import { ConversationStore } from '../src/state.js'

const TEL = '+573001234567'
/** Miércoles 11 de junio de 2025, 10:00 en Bogotá. */
const AHORA = new Date('2025-06-11T15:00:00.000Z')

/** Una orden de Sara con los detalles mínimos para el antes → después. */
function orden(extra: Partial<OrdenApi>): OrdenApi {
  return {
    id: '18',
    estado: { codigo: 'creada', nombre: 'Creada' },
    fechaCreacion: '2025-06-10T15:00:00.000Z',
    fechaEntrega: '2025-06-13T12:00:00.000Z',
    asignacion: { paciente: { nombre: 'Sara Jiménez' }, doctor: { nombres: 'Ana', apellidos: 'Gómez' } },
    detalles: [{ servicio: 'Protesis', cantidad: 2, dientes: [41, 42], colorDiente: 'A2', observaciones: null }],
    ...extra,
  }
}

function montar(ordenes: OrdenApi[], falla?: ApiError) {
  const puts: Array<{ id: string; payload: ActualizarOrdenPayload }> = []
  const api = {
    getOrdenes: async () => ordenes,
    actualizarOrden: async (_t: string, id: string, payload: ActualizarOrdenPayload) => {
      if (falla) throw falla
      puts.push({ id, payload })
      return ordenes.find((o) => o.id === id)!
    },
    registrarIntencion: async () => {},
  } as unknown as ApiClient
  const store = new ConversationStore()
  const existente = new OrdenExistenteFlows(store, api, () => AHORA)
  return { existente, puts }
}

const consultar = (existente: OrdenExistenteFlows) => existente.handle(TEL, 'la orden 18')

describe('S8 · la ventana de edición la dice la API, no el bot', () => {
  it('lee `editable` del payload; sin el campo vuelve al respaldo por estado (legado)', () => {
    expect(esEditable(orden({ estado: { codigo: 'creada' } }))).toBe(true)
    // Una API nueva manda el campo y manda: en_proceso dentro de la ventana sí se edita.
    expect(esEditable(orden({ estado: { codigo: 'en_proceso' }, editable: true }))).toBe(true)
    // Y al revés: `editable: false` cierra la orden aunque el estado fuera editable antes.
    expect(esEditable(orden({ estado: { codigo: 'creada' }, editable: false }))).toBe(false)
  })

  it('una orden editable invita a cambiar', async () => {
    const { existente } = montar([orden({ estado: { codigo: 'en_proceso', nombre: 'En producción' }, editable: true })])

    const respuesta = await consultar(existente)

    expect(respuesta.text).toContain(AYUDA_CAMBIAR)
    expect(respuesta.text).not.toContain('el laboratorio lo cambia desde su lado')
  })

  it('una orden con la ventana cerrada no invita: dice que lo cambia el laboratorio', async () => {
    const { existente } = montar([orden({ estado: { codigo: 'en_proceso', nombre: 'En producción' }, editable: false })])

    const respuesta = await consultar(existente)

    expect(respuesta.text).not.toContain(AYUDA_CAMBIAR)
    expect(respuesta.text).toContain('el laboratorio lo cambia desde su lado')
  })

  it('un cambio sobre una orden con la ventana cerrada no escribe', async () => {
    const { existente, puts } = montar([orden({ estado: { codigo: 'recibida', nombre: 'Recibida' }, editable: false })])

    const respuesta = await existente.handle(TEL, 'quita el 42 de la orden de Sara Jimenez')

    expect(respuesta.text).toContain('ya no se puede cambiar')
    expect(respuesta.text).toContain('escríbele al laboratorio')
    expect(puts).toEqual([])
  })

  it('un 409 de la API también produce un mensaje honesto', async () => {
    const { existente, puts } = montar([orden({ editable: true })], new ApiError(409, 'conflicto'))

    await existente.handle(TEL, 'quita el 42 de la orden de Sara Jimenez')
    const respuesta = await existente.handle(TEL, 'sí')

    expect(puts).toEqual([])
    expect(respuesta.text).toContain('No pude guardar el cambio (la orden ya no admite cambios)')
    expect(respuesta.text).toContain('responde sí para reintentar o no para descartar')
  })

  it('un 403 de la API también produce un mensaje honesto', async () => {
    const { existente } = montar([orden({ editable: true })], new ApiError(403, 'prohibido'))

    await existente.handle(TEL, 'quita el 42 de la orden de Sara Jimenez')
    const respuesta = await existente.handle(TEL, 'sí')

    expect(respuesta.text).toContain('No pude guardar el cambio (la orden ya no admite cambios)')
  })
})
