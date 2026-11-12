import { describe, expect, it } from 'bun:test'
import { ApiError, type ApiClient, type CuentaCobroApi, type OrdenApi } from '../src/api.js'
import { buildMenu } from '../src/menu.js'
import { ConversationStore } from '../src/state.js'
import { formatoOrden, nombreArchivoSeguro, ReadFlows, type Respuesta } from '../src/flows.js'

const TELEFONO = '+573001234567'

function falsoApi(respuestas: Partial<ApiClient>): ApiClient {
  return respuestas as unknown as ApiClient
}

const ORDEN: OrdenApi = {
  id: '1234',
  estado: { nombre: 'En producción' },
  fechaEntrega: '2025-03-10T12:00:00.000Z',
  asignacion: {
    doctor: { nombres: 'Ana', apellidos: 'Gómez' },
    paciente: { nombre: 'Luis Pérez' },
  },
  detalles: [
    { servicio: 'Corona zirconio', cantidad: 2, dientes: [26, 27], colorDiente: 'A1' },
  ],
}

function flujos(api: ApiClient): ReadFlows {
  return new ReadFlows(new ConversationStore(), api)
}

async function enviar(flows: ReadFlows, textos: string[]): Promise<Respuesta> {
  let r: Respuesta = { kind: 'text', text: '' }
  for (const texto of textos) r = await flows.handle(TELEFONO, texto)
  return r
}

describe('formato de orden', () => {
  it('líneas cortas, sin ids ni JSON', () => {
    const texto = formatoOrden(ORDEN)
    expect(texto).toContain('Orden 1234')
    expect(texto).toContain('Estado: En producción')
    expect(texto).toContain('Entrega: 2025-03-10')
    expect(texto).toContain('Doctor: Ana Gómez')
    expect(texto).toContain('Paciente: Luis Pérez')
    expect(texto).toContain('- Corona zirconio × 2 (dientes 26 27), color A1')
    expect(texto).not.toContain('{')
    expect(texto).not.toContain('asignacion')
  })

  it('campos faltantes legibles', () => {
    const texto = formatoOrden({ id: '1', estado: null, fechaEntrega: null, detalles: [] })
    expect(texto).toContain('Entrega: Por definir')
    expect(texto).toContain('Doctor: Por asignar')
  })
})

describe('flujo 1: estado de pedido', () => {
  it('feliz: menú → 1 → número → resumen', async () => {
    const api = falsoApi({ getOrden: async () => ORDEN })
    const r = await enviar(flujos(api), ['1', '1234'])
    expect(r.kind).toBe('text')
    expect((r as { text: string }).text).toContain('Estado: En producción')
  })

  it('404 de la API → palabras, no ids', async () => {
    const api = falsoApi({ getOrden: async () => { throw new ApiError(404, 'no') } })
    const r = await enviar(flujos(api), ['1', '9999'])
    expect(r.kind).toBe('text')
    expect((r as { text: string }).text).toContain('No encontré esa orden')
  })

  it('entrada no numérica vuelve a pedir el número', async () => {
    const api = falsoApi({ getOrden: async () => ORDEN })
    const r = await enviar(flujos(api), ['1', 'hola'])
    expect((r as { text: string }).text).toContain('Escribe solo el número')
  })
})

describe('flujo 2: control de trabajos (PDF)', () => {
  it('feliz: envía documento con nombre control-<n>.pdf', async () => {
    const api = falsoApi({ pdfControlTrabajos: async () => Buffer.from('%PDF') })
    const r = await enviar(flujos(api), ['2', '1234'])
    expect(r.kind).toBe('document')
    const d = r as { filename: string; buffer: Buffer; text: string }
    expect(d.filename).toBe('control-1234.pdf')
    expect(d.buffer.length).toBeGreaterThan(0)
    expect(d.text).toContain('Control de trabajos')
  })

  it('404 en el PDF → palabras, nunca un documento vacío', async () => {
    const api = falsoApi({ pdfControlTrabajos: async () => { throw new ApiError(404, 'no') } })
    const r = await enviar(flujos(api), ['2', '9999'])
    expect(r.kind).toBe('text')
    expect((r as { text: string }).text).toContain('No encontré esa orden')
  })
})

describe('nombres de archivo seguros', () => {
  it('cuenta: sanitiza ../, saltos de línea y valores largos', async () => {
    const cuenta: CuentaCobroApi = { numero: '../../etc/passwd\nCC-2025-07', pdfUrl: 'https://pdf.test/cc.pdf' }
    const api = falsoApi({
      getCuentaCobro: async () => cuenta,
      descargarPdf: async () => Buffer.from('%PDF'),
    })
    const r = await enviar(flujos(api), ['3', '42'])
    expect(r.kind).toBe('document')
    const d = r as { filename: string }
    expect(d.filename).toBe('cuenta-....etcpasswdCC-2025-07.pdf')
    expect(d.filename).not.toContain('/')
    expect(d.filename).not.toContain('\n')
    const largo200 = 'A'.repeat(100) + '/' + 'B'.repeat(100)
    const cuenta2: CuentaCobroApi = { numero: largo200, pdfUrl: 'https://pdf.test/cc.pdf' }
    const api2 = falsoApi({ getCuentaCobro: async () => cuenta2, descargarPdf: async () => Buffer.from('%PDF') })
    const r2 = await enviar(flujos(api2), ['3', '42'])
    expect((r2 as { filename: string }).filename.length).toBeLessThanOrEqual(60)
  })

  it('si nada es utilizable, cae al id numérico', () => {
    expect(nombreArchivoSeguro('///', '7')).toBe('7')
  })

  it('control de trabajos también sanitiza', () => {
    expect(nombreArchivoSeguro('..\nx', '1')).toBe('..x')
  })
})

describe('flujo 3: cuenta de cobro (PDF)', () => {
  it('feliz: descarga el pdfUrl y lo envía como cuenta-<numero>.pdf', async () => {
    const cuenta: CuentaCobroApi = { numero: 'CC-2025-07', pdfUrl: 'https://pdf.test/cc.pdf' }
    const consultas: Array<[string, string]> = []
    const api = falsoApi({
      getCuentaCobro: async (telefono: string, id: string) => {
        consultas.push([telefono, id])
        return cuenta
      },
      descargarPdf: async () => Buffer.from('%PDF'),
    })
    const r = await enviar(flujos(api), ['3', '07'])
    expect(r.kind).toBe('document')
    const d = r as { filename: string; buffer: Buffer }
    expect(d.filename).toBe('cuenta-CC-2025-07.pdf')
    expect(d.buffer.length).toBeGreaterThan(0)
    // La consulta usa el teléfono verificado y el id pedido, nunca otro (S3).
    expect(consultas).toEqual([['+573001234567', '07']])
  })

  it('404 → "no encontrada" y no reintenta con otro id', async () => {
    let llamadas = 0
    const api = falsoApi({
      getCuentaCobro: async () => { llamadas += 1; throw new ApiError(404, 'no') },
    })
    const r = await enviar(flujos(api), ['3', '07'])
    expect(r.kind).toBe('text')
    expect((r as { text: string }).text).toContain('No encontré esa cuenta de cobro')
    expect(llamadas).toBe(1)
  })

  it('cuenta sin pdfUrl → palabras, no documento', async () => {
    const api = falsoApi({ getCuentaCobro: async () => ({ numero: 'CC-1', pdfUrl: null }) })
    const r = await enviar(flujos(api), ['3', '1'])
    expect(r.kind).toBe('text')
    expect((r as { text: string }).text).toContain('todavía no tiene el PDF')
  })

  it('403 en la descarga del pdfUrl → palabras, no documento', async () => {
    const api = falsoApi({
      getCuentaCobro: async () => ({ numero: 'CC-1', pdfUrl: 'https://pdf.test/cc.pdf' }),
      descargarPdf: async () => { throw new ApiError(403, 'no') },
    })
    const r = await enviar(flujos(api), ['3', '1'])
    expect(r.kind).toBe('text')
    expect((r as { text: string }).text).toContain('No encontré esa cuenta de cobro')
  })
})

describe('cancelación y menú', () => {
  it('"0" en un paso vuelve al menú y borra el paso', async () => {
    const store = new ConversationStore()
    const flows = new ReadFlows(store, falsoApi({}))
    await flows.handle(TELEFONO, '1')
    expect(store.get(TELEFONO)?.step).toBe('pedido-numero')
    const r = await flows.handle(TELEFONO, '0')
    expect((r as { text: string }).text).toContain(buildMenu())
    expect(store.get(TELEFONO)).toBeUndefined()
  })

  it('"cancelar" también cancela, sin distinguir mayúsculas', async () => {
    const store = new ConversationStore()
    const flows = new ReadFlows(store, falsoApi({}))
    await flows.handle(TELEFONO, '3')
    const r = await flows.handle(TELEFONO, 'Cancelar')
    expect((r as { text: string }).text).toContain('De vuelta al menú')
    expect(store.get(TELEFONO)).toBeUndefined()
  })

  it('tras un flujo exitoso vuelve al menú', async () => {
    const store = new ConversationStore()
    const flows = new ReadFlows(store, falsoApi({ getOrden: async () => ORDEN }))
    await flows.handle(TELEFONO, '1')
    await flows.handle(TELEFONO, '1234')
    expect(store.get(TELEFONO)).toBeUndefined()
    const r = await flows.handle(TELEFONO, 'texto suelto')
    expect((r as { text: string }).text).toBe(buildMenu())
  })

  it('la opción 4 (crear orden) todavía no está disponible', async () => {
    const flows = flujos(falsoApi({}))
    const r = await flows.handle(TELEFONO, '4')
    expect((r as { text: string }).text).toContain('todavía no está disponible')
  })
})
