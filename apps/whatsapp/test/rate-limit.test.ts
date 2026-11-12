import { describe, expect, it } from 'bun:test'
import {
  MAX_INTERACCIONES_POR_MINUTO,
  MAX_LLAMADAS_POR_DIA,
  MENSAJE_LIMITE,
  MENSAJE_LIMITE_LLAMADA,
  RateLimiter,
  ventanaPermite,
} from '../src/rate-limit.js'

describe('ventanaPermite (pura)', () => {
  it('permite hasta el tope y luego rechaza', () => {
    let v = undefined
    const r: boolean[] = []
    for (let i = 0; i < 5; i++) {
      const out = ventanaPermite(v, 1000 + i * 1000, 60_000, 3)
      v = out.ventana
      r.push(out.permitido)
    }
    expect(r).toEqual([true, true, true, false, false])
  })

  it('resetea después de la ventana', () => {
    const primero = ventanaPermite(undefined, 1000, 60_000, 2)
    expect(primero.permitido).toBe(true)
    const segundo = ventanaPermite(primero.ventana, 1000 + 59_000, 60_000, 2)
    expect(segundo.permitido).toBe(true)
    const bloqueado = ventanaPermite(segundo.ventana, 1000 + 60_000, 60_000, 2)
    expect(bloqueado.permitido).toBe(true) // ventana nueva: contador 1
    const tercero = ventanaPermite(bloqueado.ventana, 1000 + 60_001, 60_000, 2)
    expect(tercero.permitido).toBe(true)
    const cuarto = ventanaPermite(tercero.ventana, 1000 + 61_000, 60_000, 2)
    expect(cuarto.permitido).toBe(false)
  })
})

describe('RateLimiter (memoria, reloj inyectado)', () => {
  it('constantes: un puñado de interacciones por minuto y tope diario de llamadas', () => {
    expect(MAX_INTERACCIONES_POR_MINUTO).toBeGreaterThanOrEqual(10)
    expect(MAX_INTERACCIONES_POR_MINUTO).toBeLessThan(60)
    expect(MAX_LLAMADAS_POR_DIA).toBeGreaterThanOrEqual(2)
    expect(MAX_LLAMADAS_POR_DIA).toBeLessThan(10)
  })

  it('interaccion: permite N por minuto, luego false', () => {
    const limites = new RateLimiter()
    const out: boolean[] = []
    for (let i = 0; i < MAX_INTERACCIONES_POR_MINUTO + 2; i++) {
      out.push(limites.interaccion('+573001234567', 1000 + i * 1000))
    }
    expect(out.filter(Boolean).length).toBe(MAX_INTERACCIONES_POR_MINUTO)
    expect(out.at(-1)).toBe(false)
  })

  it('llamada: permite el tope diario y luego false; otro número no se afecta', () => {
    const limites = new RateLimiter()
    for (let i = 0; i < MAX_LLAMADAS_POR_DIA; i++) {
      expect(limites.llamada('+573001234567', 1000 + i)).toBe(true)
    }
    expect(limites.llamada('+573001234567', 5000)).toBe(false)
    expect(limites.llamada('+573009876543', 5000)).toBe(true)
  })

  it('los mensajes de límite son cortos y no vacíos', () => {
    expect(MENSAJE_LIMITE.length).toBeGreaterThan(10)
    expect(MENSAJE_LIMITE_LLAMADA.length).toBeGreaterThan(10)
  })
})
