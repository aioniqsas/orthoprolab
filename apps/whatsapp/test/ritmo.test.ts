import { describe, expect, it } from 'bun:test'
import {
  PAUSA_MAXIMA_MS,
  PAUSA_POR_CARACTER_MS,
  esperarEscribiendo,
  pausaAntesDeResponder,
  textoDeRespuesta,
  type Presencia,
} from '../src/ritmo'

describe('pausaAntesDeResponder', () => {
  it('calcula 0,3 s por carácter', () => {
    expect(PAUSA_POR_CARACTER_MS).toBe(300)
    expect(pausaAntesDeResponder('hola')).toBe(1200)
    expect(pausaAntesDeResponder('x'.repeat(40))).toBe(12_000)
  })

  it('se topa, porque 90 s de "escribiendo" es peor que contestar rápido', () => {
    expect(pausaAntesDeResponder('x'.repeat(300))).toBe(PAUSA_MAXIMA_MS)
    expect(PAUSA_MAXIMA_MS).toBeLessThanOrEqual(20_000)
  })

  it('un texto vacío no espera', () => {
    expect(pausaAntesDeResponder('')).toBe(0)
  })
})

describe('esperarEscribiendo', () => {
  const registro: Presencia[] = []
  const esperas: number[] = []
  const presencia = async (estado: Presencia) => {
    registro.push(estado)
  }
  const esperar = async (ms: number) => {
    esperas.push(ms)
  }

  it('enciende el indicador, espera el total y lo apaga', async () => {
    registro.length = 0
    esperas.length = 0
    await esperarEscribiendo(1200, presencia, esperar)
    expect(esperas).toEqual([1200])
    expect(registro).toEqual(['composing', 'paused'])
  })

  it('refresca el indicador en tramos para que no expire', async () => {
    registro.length = 0
    esperas.length = 0
    await esperarEscribiendo(12_000, presencia, esperar)
    expect(esperas).toEqual([5000, 5000, 2000])
    expect(registro).toEqual(['composing', 'composing', 'composing', 'paused'])
  })

  it('sin espera no toca el indicador', async () => {
    registro.length = 0
    esperas.length = 0
    await esperarEscribiendo(0, presencia, esperar)
    expect(registro).toEqual([])
    expect(esperas).toEqual([])
  })
})

describe('textoDeRespuesta', () => {
  it('usa el cuerpo o el pie del documento', () => {
    expect(textoDeRespuesta({ text: 'hola' })).toBe('hola')
    expect(textoDeRespuesta({ caption: 'papel del trabajo' })).toBe('papel del trabajo')
    expect(textoDeRespuesta({})).toBe('')
  })
})
