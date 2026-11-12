import { describe, expect, it } from 'bun:test'
import { DatosBot, type ClientePg } from '../src/datos'
import { ClienteGroq } from '../src/llm'
import { NOMBRE_BOT_DEFECTO } from '../src/prompt'

const CONFIG = { host: 'db', port: 5432, database: 'orthopro', user: 'whatsapp_bot', password: 'secreto' }

/** Pool falso que cuenta las SELECT de nombre y responde con la fila configurada. */
function poolNombre(nombre: string | null) {
  let selects = 0
  const cliente: ClientePg = {
    query: async (sql) => {
      if (/^SELECT/.test(sql) && !sql.includes('set_config')) {
        selects++
        return { rows: nombre === null ? [] : [{ valor: nombre }] }
      }
      return { rows: [] }
    },
    release: () => {},
  }
  return { pool: { connect: async () => cliente }, consultas: () => selects }
}

describe('nombre del bot desde la base (IA8)', () => {
  it('lee el nombre una vez y lo cachea: la segunda llamada dentro de la ventana no consulta', async () => {
    const { pool, consultas } = poolNombre('Aioniq dental')
    const datos = new DatosBot(CONFIG, pool)
    expect(await datos.nombreBot('42', 1_000)).toBe('Aioniq dental')
    expect(await datos.nombreBot('42', 2_000)).toBe('Aioniq dental')
    expect(consultas()).toBe(1)
  })

  it('el caché refresca al vencer la ventana', async () => {
    const { pool, consultas } = poolNombre('Aioniq dental')
    const datos = new DatosBot(CONFIG, pool)
    const ttl = 3 * 60 * 1000
    expect(await datos.nombreBot('42', 1_000, ttl)).toBe('Aioniq dental')
    expect(await datos.nombreBot('42', 1_000 + ttl, ttl)).toBe('Aioniq dental')
    expect(consultas()).toBe(2)
  })

  it('una lectura que falla o una fila ausente cae a Aioniq sin lanzar', async () => {
    const { pool } = poolNombre(null)
    const datos = new DatosBot(CONFIG, pool)
    expect(await datos.nombreBot('42')).toBe(NOMBRE_BOT_DEFECTO)
    const roto = new DatosBot(CONFIG, {
      connect: async () => {
        throw new Error('caída')
      },
    })
    expect(await roto.nombreBot('42')).toBe(NOMBRE_BOT_DEFECTO)
    const sinDatos = new DatosBot(null)
    expect(await sinDatos.nombreBot('42')).toBe(NOMBRE_BOT_DEFECTO)
  })

  it('la negativa de identidad usa el valor leído de la base', async () => {
    const { pool } = poolNombre('Laboratorio Sur')
    const datos = new DatosBot(CONFIG, pool)
    const config = { apiKey: 'k', modelo: 'm', timeoutMs: 100, nombre: NOMBRE_BOT_DEFECTO }
    const cliente = new ClienteGroq(config, (async () => {
      throw new Error('no debe llamar al modelo')
    }) as unknown as typeof fetch)
    config.nombre = await datos.nombreBot('42')
    const r = await cliente.manejar('tel', '¿eres un robot?', datos, '42', { get: () => undefined, set: () => {} } as never)
    expect(r.texto).toBe('Soy Laboratorio Sur. Si prefieres hablar con una persona, escribe ayuda y te llamamos.')
  })
})
