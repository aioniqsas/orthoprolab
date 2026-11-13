import { describe, expect, it } from 'bun:test'
import { esPalabraNumerica, numeroEnPalabras } from '../src/numeros'
import { numeroDeOrden, pacienteDeOrden } from '../src/orden-existente'

describe('números dichos con palabras (L3)', () => {
  it('entiende las formas en que la gente escribe un número', () => {
    expect(numeroEnPalabras('diecisiete')).toBe(17)
    expect(numeroEnPalabras('dieciséis')).toBe(16)
    expect(numeroEnPalabras('veintiuno')).toBe(21)
    expect(numeroEnPalabras('treinta y dos')).toBe(32)
    expect(numeroEnPalabras('noventa y nueve')).toBe(99)
    expect(numeroEnPalabras('cien')).toBe(100)
  })

  it('no inventa un número donde no lo hay', () => {
    expect(numeroEnPalabras('sara jimenez')).toBeNull()
    expect(numeroEnPalabras('')).toBeNull()
  })

  it('reconoce una palabra numérica suelta', () => {
    expect(esPalabraNumerica('Diecisiete')).toBe(true)
    expect(esPalabraNumerica('Sara')).toBe(false)
  })
})

describe('la orden diecisiete es la orden 17, no un paciente (L3)', () => {
  const pregunta = '¿ Cual es el estado de la Orden Diecisiete?'

  it('el número se lee aunque venga con letras', () => {
    expect(numeroDeOrden(pregunta)).toBe('17')
    expect(numeroDeOrden('la orden treinta y dos')).toBe('32')
  })

  it('no se inventa un paciente con el número', () => {
    expect(pacienteDeOrden(pregunta)).toBe('')
    expect(pacienteDeOrden('la orden de Sara Jimenez')).toBe('Sara Jimenez')
    expect(pacienteDeOrden('la orden diecisiete de Sara')).toBe('Sara')
  })

})
