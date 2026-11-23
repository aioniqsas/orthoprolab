import { describe, expect, test } from 'bun:test'
import { crearLoggerSencillo, loggerDesdeEntorno, resumirAviso } from '../src/registro'

describe('logger sencillo de Baileys', () => {
  test('info, debug y trace no imprimen nada', () => {
    const lineas: string[] = []
    const logger = crearLoggerSencillo((l) => lineas.push(l))
    logger.info({ node: { username: '573001234567' } }, 'logging in...')
    logger.debug({}, 'x')
    logger.trace({}, 'y')
    expect(lineas).toEqual([])
  })

  test('aviso y error salen en una línea legible, sin volcar el objeto', () => {
    const lineas: string[] = []
    const logger = crearLoggerSencillo((l) => lineas.push(l))
    logger.warn({ secreto: 'abc', clientHello: { ephemeral: 'zzz' } }, 'no pude descifrar un mensaje')
    logger.error({ err: new Error('conexión cerrada') }, 'falló el socket')
    expect(lineas).toEqual([
      '[whatsapp] aviso: no pude descifrar un mensaje',
      '[whatsapp] error: falló el socket: conexión cerrada',
    ])
    expect(lineas.join('')).not.toContain('abc')
  })

  test('child devuelve el mismo logger', () => {
    const logger = crearLoggerSencillo(() => undefined)
    expect(logger.child({ class: 'baileys' })).toBe(logger)
  })

  test('resumirAviso acepta texto suelto y recorta lo largo', () => {
    expect(resumirAviso('algo pasó')).toBe('algo pasó')
    expect(resumirAviso({}, 'a'.repeat(300))).toHaveLength(201)
  })

  test('WHATSAPP_LOG_DETALLE=1 devuelve el logger de fábrica (undefined)', () => {
    expect(loggerDesdeEntorno({ WHATSAPP_LOG_DETALLE: '1' })).toBeUndefined()
    expect(loggerDesdeEntorno({})).toBeDefined()
  })
})
