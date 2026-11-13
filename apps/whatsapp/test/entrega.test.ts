import { describe, expect, test } from 'bun:test'
import { entregaDeTexto } from '../src/tiempo'
import { interpretar, aplicarCambios } from '../src/orden-existente'
import { OrderFlows, resumenOrden, SIN_AVANCE_CONFIRMAR } from '../src/write-flows'
import { ConversationStore } from '../src/state'
import type { ApiClient, OrdenApi, NuevaOrdenPayload } from '../src/api'

// Viernes 13 de noviembre de 2026, mediodía en Bogotá.
const AHORA = new Date('2026-11-13T17:00:00Z')

describe('entregaDeTexto (S1, S4)', () => {
  test('"urgente para el jueves" resuelve el jueves que viene y la urgencia', () => {
    const e = entregaDeTexto('Necesito que sea urgente para el jueves', AHORA)
    expect(e.fecha).toBe('2026-11-19')
    expect(e.urgente).toBe(true)
  })
  test('"para mañana" y "para hoy"', () => {
    expect(entregaDeTexto('lo necesito para mañana', AHORA).fecha).toBe('2026-11-14')
    expect(entregaDeTexto('para hoy porfa', AHORA).fecha).toBe('2026-11-13')
  })
  test('sin entrega: nada', () => {
    const e = entregaDeTexto('añade otra protesis para el 32', AHORA)
    expect(e.fecha).toBeNull()
    expect(e.urgente).toBe(false)
  })
  test('"la orden del martes" no es entrega: sigue siendo día de creación (hacia atrás)', () => {
    const i = interpretar('la orden del martes, entrégala para el viernes', AHORA)
    expect(i.dia).toBe('2026-11-10')
    expect(i.entrega).toBe('2026-11-20')
  })
})

function api(registro: { creada?: NuevaOrdenPayload }): ApiClient {
  return {
    getDoctores: async () => [{ id: '7', nombres: 'Doctor', apellidos: 'Nefario' }],
    getServicios: async () => [{ id: '1', nombre: 'Protesis' }],
    getPacientes: async () => [{ id: '3', nombre: 'Santiago Aristizabal' }],
    getOrdenes: async () => [],
    crearOrden: async (_t: string, p: NuevaOrdenPayload) => {
      registro.creada = p
      return { id: '99' }
    },
  } as unknown as ApiClient
}

describe('orden nueva conversacional (transcripción del 13/11)', () => {
  test('la entrega del primer mensaje llega al resumen y al POST', async () => {
    const registro: { creada?: NuevaOrdenPayload } = {}
    const flujo = new OrderFlows(new ConversationStore(), api(registro))
    const tel = '573000000000'
    await flujo.handle(tel, 'necesito crear una orden para el paciente Santiago Aristizabal, hay que hacerle unas prótesis de los 14 y 13, es urgente para el jueves, lo atendió el doctor nefario')
    await flujo.handle(tel, '2')
    const resumen = await flujo.handle(tel, 'Blanco')
    expect(resumen.text).toContain('Entrega: jueves 19 de noviembre de 2026 (urgente)')
    await flujo.handle(tel, 'sí')
    expect(registro.creada?.urgente).toBe(true)
    expect(registro.creada?.fechaEntrega).toMatch(/^2026-11-\d\d$/)
  })

  test('en la confirmación "Necesito que sea urgente para el jueves" cambia la orden, sin "No entendí"', async () => {
    const registro: { creada?: NuevaOrdenPayload } = {}
    const store = new ConversationStore()
    const flujo = new OrderFlows(store, api(registro))
    const tel = '573000000001'
    store.set(tel, 'orden-confirmar', {
      doctorId: '7', doctorNombre: 'Doctor Nefario', pacienteId: '3', pacienteNombre: 'Santiago Aristizabal',
      servicioNombre: 'Protesis', cantidad: '3', dientes: '14,13,32', color: 'Blanco', idemKey: 'k',
    })
    const r = await flujo.handle(tel, 'Necesito que sea urgente para el jueves')
    expect(r.text).not.toContain('No entendí')
    expect(r.text).toContain('(urgente)')
    // El pie de confirmación sale una sola vez.
    expect(r.text.match(/Responde sí/g)?.length).toBe(1)
    await flujo.handle(tel, 'si')
    expect(registro.creada?.urgente).toBe(true)
    expect(registro.creada?.fechaEntrega).toBeDefined()
  })

  test('lo que no se entiende en la confirmación dice qué sí se puede hacer', async () => {
    const store = new ConversationStore()
    const flujo = new OrderFlows(store, api({}))
    const tel = '573000000002'
    store.set(tel, 'orden-confirmar', { doctorId: '7', servicioNombre: 'Protesis', cantidad: '1', dientes: '11', color: 'A2', idemKey: 'k' })
    const r = await flujo.handle(tel, 'mmm')
    expect(r.text).toBe(SIN_AVANCE_CONFIRMAR)
    expect(r.text).toContain('fecha de entrega')
  })

  test('sin entrega, el resumen no inventa una línea de entrega', () => {
    expect(resumenOrden({ cantidad: '1' })).not.toContain('Entrega:')
  })
})

describe('orden existente: entrega y urgencia (S1)', () => {
  const orden: OrdenApi = {
    id: '18',
    estado: { codigo: 'creada', nombre: 'Creada' },
    fechaEntrega: null,
    detalles: [{ servicio: 'Protesis', cantidad: 1, dientes: [42], colorDiente: 'A2' }],
  }
  test('solo la entrega ya es un cambio que se escribe', () => {
    const r = aplicarCambios(orden, { quitar: [], agregar: [], entrega: '2026-11-20', urgente: true })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.entrega).toBe('2026-11-20')
      expect(r.urgente).toBe(true)
    }
  })
})
