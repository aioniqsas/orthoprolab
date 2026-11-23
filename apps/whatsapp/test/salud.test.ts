import { describe, expect, test } from 'bun:test'
import { iniciarServidorSalud, puertoSalud, respuestaSalud } from '../src/salud'

describe('puertoSalud', () => {
  test('sin PORT no hay servidor', () => {
    expect(puertoSalud({})).toBeUndefined()
    expect(puertoSalud({ PORT: '' })).toBeUndefined()
  })

  test('acepta un puerto válido y rechaza el resto', () => {
    expect(puertoSalud({ PORT: '3003' })).toBe(3003)
    expect(puertoSalud({ PORT: ' 8080 ' })).toBe(8080)
    expect(puertoSalud({ PORT: '0' })).toBeUndefined()
    expect(puertoSalud({ PORT: '70000' })).toBeUndefined()
    expect(puertoSalud({ PORT: 'abc' })).toBeUndefined()
  })
})

describe('servidor de salud', () => {
  test('responde 200 con el estado, sin importar la ruta', async () => {
    let estado: 'conectado' | 'conectando' = 'conectando'
    const servidor = iniciarServidorSalud(0, () => estado)
    try {
      const a = await fetch(`http://127.0.0.1:${servidor.port}/`)
      expect(a.status).toBe(200)
      expect(await a.json()).toEqual({ estado: 'conectando' })

      estado = 'conectado'
      const b = await fetch(`http://127.0.0.1:${servidor.port}/health`)
      expect(b.status).toBe(200)
      expect(await b.json()).toEqual({ estado: 'conectado' })
    } finally {
      servidor.stop(true)
    }
  })

  test('la respuesta no se cachea', () => {
    expect(respuestaSalud('conectado').headers.get('Cache-Control')).toBe('no-store')
  })
})
