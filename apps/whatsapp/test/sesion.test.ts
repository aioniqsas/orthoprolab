import { describe, expect, it } from 'bun:test'
import {
  INSTRUCCION_CODIGO,
  MENSAJE_SESION_TERMINADA,
  iniciarSesion,
  mostrarCodigoEmparejamiento,
  planDesconexion,
  telefonoEmparejamiento,
} from '../src/sesion.js'

type Manejador = (datos: unknown) => void

function socketFalso() {
  const manejadores = new Map<string, Manejador[]>()
  return {
    socket: {
      ev: {
        on: (evento: string, fn: Manejador) => {
          const lista = manejadores.get(evento) ?? []
          lista.push(fn)
          manejadores.set(evento, lista)
        },
      },
    } as never,
    emitir: (evento: string, datos: unknown) => {
      for (const fn of manejadores.get(evento) ?? []) fn(datos)
    },
  }
}

function sesionFalsa(opciones: Partial<Parameters<typeof iniciarSesion>[0]> = {}) {
  const falso = socketFalso()
  const creado: Record<string, unknown>[] = []
  const registros: string[] = []
  let mostrarQr: string | undefined
  let mostrarCodigo: string | undefined
  const pedir = async (numero: string) => `AB12CD34:${numero}`
  const promesa = iniciarSesion({
    crearSocket: ((o: Record<string, unknown>) => {
      creado.push(o)
      return falso.socket
    }) as never,
    consultarVersion: (async () => ({ version: [2, 3000, 101], isLatest: true })) as never,
    auth: { creds: { signedIdentityKey: {}, signedPreKey: {}, registrationId: 1 }, keys: {} } as never,
    pedirCodigo: pedir,
    mostrarQr: (qr: string) => {
      mostrarQr = qr
    },
    mostrarCodigo: (codigo: string) => {
      mostrarCodigo = codigo
    },
    log: (linea: string) => {
      registros.push(linea)
    },
    ...opciones,
  })
  return { promesa, falso, creado, registros, verQr: () => mostrarQr, verCodigo: () => mostrarCodigo }
}

describe('versión de WhatsApp Web', () => {
  it('el resultado de fetchLatestBaileysVersion se pasa al factory del socket', async () => {
    const { promesa, creado, registros } = sesionFalsa()
    await promesa
    expect(creado[0]!.version).toEqual([2, 3000, 101])
    expect(registros.some((l) => l.includes('2.3000.101'))).toBe(true)
  })

  it('si la consulta falla, el socket se crea sin versión y se avisa', async () => {
    const { promesa, creado, registros } = sesionFalsa({
      consultarVersion: (async () => {
        throw new Error('sin red')
      }) as never,
    })
    await promesa
    expect(creado[0]!.version).toBeUndefined()
    expect(registros.some((l) => l.includes('No se pudo consultar la versión'))).toBe(true)
  })
})

describe('vía QR', () => {
  it('renderiza el QR con el string de Baileys y no pide código', async () => {
    const { promesa, falso, verQr, verCodigo } = sesionFalsa()
    await promesa
    falso.emitir('connection.update', { qr: '2@abcDEF123' })
    expect(verQr()).toBe('2@abcDEF123')
    expect(verCodigo()).toBeUndefined()
  })
})

describe('vía código de emparejamiento (WHATSAPP_PAIRING_PHONE)', () => {
  it('pide el código una vez con el teléfono y lo muestra; nunca QR', async () => {
    let pedidos = 0
    const pedir = async (numero: string) => {
      pedidos += 1
      return `AB12CD34-${numero}`
    }
    const { promesa, falso, verQr, verCodigo } = sesionFalsa({ telefonoVinculado: '573001234567', pedirCodigo: pedir })
    await promesa
    falso.emitir('connection.update', { qr: '2@abc' })
    falso.emitir('connection.update', { qr: '2@def' })
    await new Promise((r) => setTimeout(r, 0))
    expect(pedidos).toBe(1)
    expect(verCodigo()).toBe('AB12CD34-573001234567')
    expect(verQr()).toBeUndefined()
  })

  it('WHATSAPP_PAIRING_PHONE acepta dígitos con o sin +, y rechaza lo demás', () => {
    expect(telefonoEmparejamiento('+573001234567')).toBe('573001234567')
    expect(telefonoEmparejamiento('573001234567')).toBe('573001234567')
    expect(telefonoEmparejamiento('abc')).toBeUndefined()
    expect(telefonoEmparejamiento('123')).toBeUndefined()
  })
})

describe('desconexiones', () => {
  it('el mensaje de reconexión incluye el código de estado de Baileys', () => {
    const plan = planDesconexion(440, 1, 8, 1)
    expect(plan.accion).toBe('reintentar')
    expect(plan.mensaje).toContain('código 440')
    expect(plan.mensaje).toContain('intento 2 de 8')
  })

  it('un código desconocido no silencia la razón', () => {
    expect(planDesconexion(undefined, 1, 8, 1).mensaje).toContain('código desconocido')
  })

  it('401 (loggedOut) es terminal: no reintenta y pide borrar la sesión', () => {
    for (const intento of [1, 7]) {
      const plan = planDesconexion(401, intento, 8, 1)
      expect(plan.accion).toBe('salir')
      expect(plan.mensaje).toBe(MENSAJE_SESION_TERMINADA)
    }
  })

  it('el máximo de intentos también es terminal', () => {
    const plan = planDesconexion(503, 8, 8, 60)
    expect(plan.accion).toBe('salir')
    expect(plan.mensaje).toContain('8 intentos')
  })
})

describe('código de emparejamiento impreso', () => {
  it('imprime el código y la instrucción', () => {
    const lineas: string[] = []
    const imprimir = (l: string) => lineas.push(l)
    mostrarCodigoEmparejamiento('AB12CD34', imprimir)
    expect(lineas[0]).toContain('AB12CD34')
    expect(lineas).toContain(INSTRUCCION_CODIGO)
  })
})
