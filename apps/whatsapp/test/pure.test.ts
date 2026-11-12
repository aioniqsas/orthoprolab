import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import type { ApiClient } from '../src/api'
import { buildMenu } from '../src/menu'
import { ReadFlows } from '../src/flows'
import { ConversationStore } from '../src/state'
import {
  assertAuthDirOutsideRepo,
  detectRepoRoot,
  reconnectDelayMs,
  RECONNECT_MAX_ATTEMPTS,
  shouldIgnoreSender,
} from '../src/safety'

describe('menú', () => {
  it('construye las opciones numeradas en lenguaje llano (S11)', () => {
    expect(buildMenu()).toContain('1. ¿Cómo va mi trabajo?')
    expect(buildMenu()).toContain('2. Papel del trabajo')
    expect(buildMenu()).toContain('3. Cuenta de cobro')
    expect(buildMenu()).toContain('4. Hacer un pedido')
    expect(buildMenu()).toContain('5. Que me llamen')
  })

  it('responde al texto desconocido con "No entendí" y el menú', async () => {
    const api = { solicitarLlamada: async () => {}, registrarIntencion: async () => {} } as unknown as ApiClient
    const r = await new ReadFlows(new ConversationStore(), api).handle('+573001234567', 'no entiendo')
    expect(r.kind).toBe('text')
    expect(r.text).toContain('No entendí')
    expect(r.text).toContain(buildMenu())
  })
})

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

describe('opción 5', () => {
  // La respuesta honesta (registro real o vía directa) se prueba en
  // test/llamada.test.ts; aquí solo queda el menú.
  it('la opción 5 es "Que me llamen" y el 0 ya no está en el menú (S11)', () => {
    expect(buildMenu()).toMatch(/5\. Que me llamen/)
    expect(buildMenu()).not.toMatch(/^0\./m)
    expect(buildMenu()).not.toContain('próximamente')
  })
})

describe('límite de intentos de reconexión', () => {
  it('tiene un tope de intentos definido', () => {
    expect(RECONNECT_MAX_ATTEMPTS).toBeGreaterThan(0)
  })
})
