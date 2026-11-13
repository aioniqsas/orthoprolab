import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { telefonoDelRemitente } from '../src/lid'
import { ConversationStore } from '../src/estado'
import {
  assertAuthDirOutsideRepo,
  detectRepoRoot,
  reconnectDelayMs,
  RECONNECT_MAX_ATTEMPTS,
  shouldIgnoreSender,
  motivoDescarte,
  etiquetaRemitente,
} from '../src/safety'

describe('estado de conversación', () => {
  it('permite guardar, leer y limpiar', () => {
    const store = new ConversationStore(100)
    store.set('sender', 'crear-orden', { doctor: 'doctor-id' }, 1_000)
    expect(store.get('sender', 1_099)).toMatchObject({ step: 'crear-orden', fields: { doctor: 'doctor-id' } })
    store.clear('sender')
    expect(store.get('sender', 1_099)).toBeUndefined()
  })

  it('expira después de quince minutos o del ttl configurado', () => {
    const store = new ConversationStore(100)
    store.set('sender', 'inicio', {}, 1_000)
    expect(store.get('sender', 1_100)).toBeUndefined()
  })

  it('expira entradas vencidas al escribir y respeta el tope de entradas', () => {
    const store = new ConversationStore(100, 3)
    store.set('a', 'x', {}, 1_000)
    store.set('b', 'x', {}, 1_000)
    store.set('c', 'x', {}, 1_000)
    expect(store.size).toBe(3)
    // Tope alcanzado: desaloja la más antigua ('a') aunque no esté vencida.
    store.set('d', 'x', {}, 1_050)
    expect(store.size).toBe(3)
    expect(store.get('a', 1_050)).toBeUndefined()
    expect(store.get('d', 1_050)).toBeDefined()
    // Al escribir se purgan primero las vencidas.
    store.set('e', 'x', {}, 2_000)
    expect(store.size).toBe(1)
    expect(store.get('d', 2_000)).toBeUndefined()
    expect(store.get('e', 2_000)).toBeDefined()
  })
})

describe('senderFilter', () => {
  it('responde solo a chats 1:1 (@s.whatsapp.net)', () => {
    expect(shouldIgnoreSender('573001234567@s.whatsapp.net', false)).toBe(false)
  })

  it('ignora grupos, difusiones, boletines y mensajes propios', () => {
    expect(shouldIgnoreSender('1203@g.us', false)).toBe(true)
    expect(shouldIgnoreSender('status@broadcast', false)).toBe(true)
    expect(shouldIgnoreSender('otra@broadcast', false)).toBe(true)
    expect(shouldIgnoreSender('1203@newsletter', false)).toBe(true)
    expect(shouldIgnoreSender('573001234567@s.whatsapp.net', true)).toBe(true)
    expect(shouldIgnoreSender(undefined, false)).toBe(true)
  })

  it('dice el motivo del descarte, para poder verlo en el log', () => {
    expect(motivoDescarte('573001234567@s.whatsapp.net', false)).toBeNull()
    expect(motivoDescarte('573001234567@s.whatsapp.net', true)).toBe('propio')
    expect(motivoDescarte('1203@g.us', false)).toBe('grupo')
    expect(motivoDescarte('status@broadcast', false)).toBe('estado')
    expect(motivoDescarte('1203@newsletter', false)).toBe('canal')
    expect(motivoDescarte('raro@lidl', false)).toBe('no es un chat 1:1')
    expect(motivoDescarte(undefined, false)).toBe('sin remitente')
  })

  it('etiqueta al remitente con su número solo cuando se pide', () => {
    expect(etiquetaRemitente('573001234567:12@s.whatsapp.net', true)).toBe('+573001234567')
    const oculto = etiquetaRemitente('573001234567:12@s.whatsapp.net', false)
    expect(oculto).toHaveLength(16)
    expect(oculto).not.toContain('573001234567')
  })
})

describe('telefonoDelRemitente (LID)', () => {
  const llamadas: string[] = []
  const traductor = (respuesta: string | null | Error) => async (jid: string) => {
    llamadas.push(jid)
    if (respuesta instanceof Error) throw respuesta
    return respuesta
  }
  const LID = '114800331895010@lid'
  const PN = '573001234567@s.whatsapp.net'

  it('un teléfono se usa tal cual, sin consultar el mapeo', async () => {
    llamadas.length = 0
    expect(await telefonoDelRemitente(PN, undefined, traductor(null))).toBe(PN)
    expect(llamadas).toHaveLength(0)
  })

  it('usa el número que WhatsApp manda junto al LID', async () => {
    llamadas.length = 0
    expect(await telefonoDelRemitente(LID, PN, traductor(null))).toBe(PN)
    expect(llamadas).toHaveLength(0)
  })

  it('traduce el LID con el mapeo guardado y le pasa el JID', async () => {
    llamadas.length = 0
    expect(await telefonoDelRemitente(LID, null, traductor(PN))).toBe(PN)
    expect(llamadas).toEqual([LID])
  })

  it('no identifica a nadie si el LID no tiene traducción', async () => {
    expect(await telefonoDelRemitente(LID, undefined, traductor(null))).toBeNull()
  })

  it('no identifica si la traducción falla', async () => {
    expect(await telefonoDelRemitente(LID, undefined, traductor(new Error('boom')))).toBeNull()
  })

  it('un LID es un chat 1:1; grupos y difusiones siguen fuera', () => {
    expect(motivoDescarte(LID, false)).toBeNull()
    expect(motivoDescarte(LID, true)).toBe('propio')
    expect(motivoDescarte('1203@g.us', false)).toBe('grupo')
  })
})

describe('reconnectDelayMs', () => {
  it('crece exponencialmente desde 1 s con tope de 60 s', () => {
    expect(reconnectDelayMs(1)).toBe(1000)
    expect(reconnectDelayMs(2)).toBe(2000)
    expect(reconnectDelayMs(3)).toBe(4000)
    expect(reconnectDelayMs(7)).toBe(60_000)
    expect(reconnectDelayMs(50)).toBe(60_000)
  })
})

describe('guardia del directorio de sesión', () => {
  it('rechaza rutas dentro del repositorio', () => {
    const root = '/tmp/fake-repo'
    expect(assertAuthDirOutsideRepo(`${root}/auth_info`, root).ok).toBe(false)
    expect(assertAuthDirOutsideRepo(root, root).ok).toBe(false)
  })

  it('acepta rutas externas al repositorio', () => {
    expect(assertAuthDirOutsideRepo('/home/u/.orthopro-lab/whatsapp/auth_info', '/tmp/fake-repo').ok).toBe(true)
  })

  it('detecta la raíz del repo por .git aunque haya package.json intermedios', () => {
    const base = mkdtempSync(join(tmpdir(), 'wa-guard-'))
    const appDir = join(base, 'apps', 'whatsapp')
    mkdirSync(join(appDir, 'src'), { recursive: true })
    writeFileSync(join(base, 'apps', 'whatsapp', 'package.json'), '{}')
    mkdirSync(join(base, '.git'))
    try {
      expect(detectRepoRoot(appDir)).toBe(base)
      expect(detectRepoRoot(base)).toBe(base)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})

describe('límite de intentos de reconexión', () => {
  it('tiene un tope de intentos definido', () => {
    expect(RECONNECT_MAX_ATTEMPTS).toBeGreaterThan(0)
  })
})
