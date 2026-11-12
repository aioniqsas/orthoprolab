import { describe, expect, it } from 'bun:test'
import { ApiError } from '../src/api.js'
import { VINCULAR_FALLO, VINCULAR_OK, parseVincular } from '../src/vinculacion.js'

describe('parseVincular', () => {
  it('acepta VINCULAR 123456 en mayúsculas, minúsculas y con espacios', () => {
    expect(parseVincular('VINCULAR 123456')).toBe('123456')
    expect(parseVincular('vincular 123456')).toBe('123456')
    expect(parseVincular('  Vincular   654321  ')).toBe('654321')
  })

  it('rechaza lo demás: sin código, código corto, otros mensajes', () => {
    expect(parseVincular('vincular')).toBeNull()
    expect(parseVincular('vincular 12345')).toBeNull()
    expect(parseVincular('vincular 1234567')).toBeNull()
    expect(parseVincular('hola')).toBeNull()
    expect(parseVincular('1')).toBeNull()
  })
})

describe('respuestas del vínculo', () => {
  const falsoApi = (status: number) => ({
    vincular: async (_telefono: string, _codigo: string) => {
      throw new ApiError(status, 'no')
    },
  })

  it('el éxito confirma el vínculo y lista lo que el bot puede hacer', () => {
    expect(VINCULAR_OK).toContain('vinculad')
    expect(VINCULAR_OK).toContain('Estado de pedido')
  })

  it('código errado, vencido o de otra clínica reciben el mismo texto genérico', async () => {
    for (const status of [404, 409, 400]) {
      const ok = await falsoApi(status)
        .vincular('+573001234567', '123456')
        .then(() => true, () => false)
      expect(ok).toBe(false)
    }
    // El bot elige VINCULAR_FALLO ante cualquier fallo: un solo mensaje.
    expect(VINCULAR_FALLO).toBe('No pude vincular ese código, verifica que sea el vigente.')
  })
})
