import { describe, expect, it } from 'bun:test'
import type { ApiClient } from '../src/api'
import { OrdenExistenteFlows } from '../src/orden-existente'
import { ConversationStore, UltimaOrdenVista } from '../src/state'

const TEL = '573001234567@s.whatsapp.net'

const ORDEN = {
  id: '17',
  estado: { codigo: 'creada', nombre: 'Creada' },
  fechaEntrega: '2026-11-19T00:00:00Z',
  fechaCreacion: '2026-11-13T00:00:00Z',
  asignacion: { paciente: { id: '1', nombre: 'Santiago Aristizabal' }, doctor: { id: '1' } },
  doctor: { id: '1', nombres: 'Doctor', apellidos: 'Nefario' },
  detalles: [{ id: 'd1', servicio: 'Protesis', cantidad: 2, dientes: [14, 13], colorDiente: 'blanco' }],
}

function montar(estado: { codigo: string; nombre: string } = { codigo: 'creada', nombre: 'Creada' }) {
  const ORDEN_ACTUAL = { ...ORDEN, estado }
  const actualizadas: unknown[] = []
  const api = {
    getOrden: async () => ORDEN_ACTUAL,
    getOrdenes: async () => [ORDEN_ACTUAL],
    actualizarOrden: async (_tel: string, _id: string, payload: unknown) => {
      actualizadas.push(payload)
      return ORDEN_ACTUAL
    },
  } as unknown as ApiClient
  const store = new ConversationStore()
  const ultima = new UltimaOrdenVista()
  const flujo = new OrdenExistenteFlows(store, api, () => new Date('2026-11-13T14:00:00Z'), ultima)
  return { flujo, ultima, actualizadas }
}

describe('continuidad después de ver una orden (L3)', () => {
  it('"agrega el diente 34" aplica a la orden que acaba de mostrar', async () => {
    const { flujo, ultima, actualizadas } = montar()
    ultima.recordar(TEL, '17')

    const r = await flujo.handle(TEL, 'Vamos a agregar a la orden el diente 34 una prótesis para ese diente.')

    expect(r.text).toContain('Orden 17')
    expect(r.text).toContain('34')
    expect(r.text).toContain('Antes:')
    expect(r.text).toContain('Después:')
    // Nada se escribe hasta que confirme.
    expect(actualizadas).toHaveLength(0)
  })

  it('sin orden a la vista, pregunta cuál y no adivina', async () => {
    const { flujo, actualizadas } = montar()
    const r = await flujo.handle(TEL, 'Vamos a agregar a la orden el diente 34 una prótesis para ese diente.')
    expect(r.text).toContain('orden')
    expect(actualizadas).toHaveLength(0)
  })

  it('la orden recordada caduca y deja de aplicarse', () => {
    const ultima = new UltimaOrdenVista(1000)
    ultima.recordar(TEL, '17', 0)
    expect(ultima.recordada(TEL, 500)).toBe('17')
    expect(ultima.recordada(TEL, 2000)).toBeUndefined()
  })
})

describe('la invitación a cambiar dice la verdad (L3)', () => {
  it('una orden en recibida no promete cambios que la API no permite', async () => {
    const { flujo, ultima } = montar({ codigo: 'recibida', nombre: 'Recibida' })
    ultima.recordar(TEL, '17')
    const r = await flujo.handle(TEL, 'la orden 17')
    expect(r.text).toContain('Recibida')
    expect(r.text).not.toContain('Si quieres cambiar algo')
    expect(r.text).toContain('el laboratorio lo cambia')
  })
})
