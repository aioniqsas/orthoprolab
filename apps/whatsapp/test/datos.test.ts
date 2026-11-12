import { describe, expect, it } from 'bun:test'
import { DatosBot, configuracionDesdeEntorno, NO_DISPONIBLE, SIN_CLINICA, NO_ENCONTRADO, type ClientePg } from '../src/datos'
import { HERRAMIENTAS, ejecutarHerramienta } from '../src/herramientas'

interface Registro {
  sql: string
  values?: unknown[]
}

/** Pool falso: graba cada sentencia y devuelve filas configurables. */
function poolFalso(filas: Record<string, unknown>[] = []) {
  const registros: Registro[] = []
  const cliente: ClientePg = {
    query: async (sql, values) => {
      registros.push({ sql, values })
      const i = registros.length
      if (/^(SELECT|BEGIN|COMMIT)/.test(sql) && !sql.includes('set_config')) return { rows: filas }
      return { rows: i === 1 ? [] : [] }
    },
    release: () => {},
  }
  return {
    registros,
    pool: { connect: async () => cliente },
  }
}

const CONFIG = { host: 'db', port: 5432, database: 'orthopro', user: 'whatsapp_bot', password: 'secreto' }

describe('configuración desde entorno', () => {
  it('con todas las variables devuelve la configuración', () => {
    const cfg = configuracionDesdeEntorno({
      WHATSAPP_DB_HOST: 'db',
      WHATSAPP_DB_PORT: '5432',
      WHATSAPP_DB_NAME: 'orthopro',
      WHATSAPP_DB_USER: 'whatsapp_bot',
      WHATSAPP_DB_PASSWORD: 'secreto',
    })
    expect(cfg).toEqual(CONFIG)
  })

  it('sin una variable queda indisponible', () => {
    expect(configuracionDesdeEntorno({ WHATSAPP_DB_HOST: 'db' })).toBeNull()
    expect(configuracionDesdeEntorno({})).toBeNull()
  })
})

describe('aislamiento por clínica (S2)', () => {
  it('emite BEGIN, el GUC de la clínica y COMMIT, en ese orden', async () => {
    const { pool, registros } = poolFalso([{ id: 7 }])
    const datos = new DatosBot(CONFIG, pool)
    const filas = await ejecutarHerramienta(datos, '42', { nombre: 'estado_orden', entrada: '7' })
    expect(filas.ok).toBe(true)
    const textos = registros.map((r) => r.sql)
    expect(textos[0]).toBe('BEGIN')
    // GUC con la clínica verificada como parámetro, nunca interpolado.
    expect(textos[1]).toBe('SELECT set_config($1, $2, true)')
    expect(registros[1]!.values).toEqual(['app.clinica_id', '42'])
    expect(textos[2]).toContain("set_config($1, '5s', true)")
    expect(textos[textos.length - 1]).toBe('COMMIT')
  })

  it('sin clínica verificada se niega y no abre transacción', async () => {
    const { pool, registros } = poolFalso()
    const datos = new DatosBot(CONFIG, pool)
    const r = await ejecutarHerramienta(datos, undefined, { nombre: 'listar_doctores', entrada: {} })
    expect(r).toEqual({ ok: false, texto: SIN_CLINICA })
    expect(registros).toEqual([])
  })

  it('una clínica que no es dígitos se niega', async () => {
    const { pool, registros } = poolFalso()
    const datos = new DatosBot(CONFIG, pool)
    const r = await ejecutarHerramienta(datos, "1'; DROP TABLE orden; --", { nombre: 'listar_doctores', entrada: {} })
    expect(r.ok).toBe(false)
    expect(registros).toEqual([])
  })
})

describe('catálogo cerrado (S3): cada herramienta construye su SQL y parámetros', () => {
  it('estado_orden usa $1 con el número y agrega las líneas de detalle', async () => {
    const { pool, registros } = poolFalso([{ id: 7, estado: 'en_proceso' }])
    const r = await ejecutarHerramienta(new DatosBot(CONFIG, pool), '42', { nombre: 'estado_orden', entrada: '7' })
    expect(r.ok).toBe(true)
    const sql = registros[3]!.sql
    expect(sql).toContain('WHERE o.id = $1')
    expect(registros[3]!.values).toEqual(['7'])
    expect(sql).toContain('detalle_orden')
    // Ningún valor del llamador entra en el texto.
    expect(sql).not.toContain("'7'")
  })

  it('ultima_orden_doctor filtra por doctor, excluye cancelada y limita a 1', async () => {
    const { pool, registros } = poolFalso([{ id: 3 }])
    const r = await ejecutarHerramienta(new DatosBot(CONFIG, pool), '42', {
      nombre: 'ultima_orden_doctor',
      entrada: '55',
    })
    expect(r.ok).toBe(true)
    const sql = registros[3]!.sql
    expect(sql).toContain('o.doctor_id = $1')
    expect(sql).toContain("e.codigo <> 'cancelada'")
    expect(sql).toContain('LIMIT 1')
    expect(registros[3]!.values).toEqual(['55'])
  })

  it('cuenta_de_cobro busca por número con $1 y expone total y estado', async () => {
    const { pool, registros } = poolFalso([{ numero: 'CC-1', total: '100.00' }])
    const r = await ejecutarHerramienta(new DatosBot(CONFIG, pool), '42', {
      nombre: 'cuenta_de_cobro',
      entrada: 'CC-1',
    })
    expect(r.ok).toBe(true)
    const sql = registros[3]!.sql
    expect(sql).toContain('cc.numero = $1')
    expect(sql).toContain('cc.total')
    expect(registros[3]!.values).toEqual(['CC-1'])
  })

  it('listar_doctores no acepta parámetros y activa el filtro', async () => {
    const { pool, registros } = poolFalso([{ id: 1 }])
    const r = await ejecutarHerramienta(new DatosBot(CONFIG, pool), '42', {
      nombre: 'listar_doctores',
      entrada: { hack: true },
    })
    expect(r.ok).toBe(true)
    const sql = registros[3]!.sql
    expect(sql).toContain('d.activo')
    expect(sql).toContain(`LIMIT ${HERRAMIENTAS.listar_doctores.tope}`)
    expect(registros[3]!.values).toEqual([])
  })

  it('listar_pacientes_doctor ya no existe: se rechaza sin tocar la base', async () => {
    const { pool, registros } = poolFalso()
    const r = await ejecutarHerramienta(new DatosBot(CONFIG, pool), '42', {
      nombre: 'listar_pacientes_doctor',
      entrada: '55',
    })
    expect(r.ok).toBe(false)
    expect(registros).toEqual([])
  })

  it('estado_orden expone el id del paciente, nunca su nombre', async () => {
    const { pool, registros } = poolFalso([{ id: 7, estado: 'en_proceso' }])
    const r = await ejecutarHerramienta(new DatosBot(CONFIG, pool), '42', { nombre: 'estado_orden', entrada: '7' })
    expect(r.ok).toBe(true)
    const sql = registros[3]!.sql
    expect(sql).toContain('o.paciente_id')
    expect(sql).not.toMatch(/p\.nombre/)
  })

  it('listar_servicios nunca expone precio', async () => {
    const { pool, registros } = poolFalso([{ id: 1, nombre: 'Ortodoncia' }])
    const r = await ejecutarHerramienta(new DatosBot(CONFIG, pool), '42', { nombre: 'listar_servicios', entrada: null })
    expect(r.ok).toBe(true)
    const sql = registros[3]!.sql
    expect(sql).toContain('s.activo')
    expect(sql.toLowerCase()).not.toContain('precio')
    expect(registros[3]!.values).toEqual([])
  })
})

describe('columnas cifradas fuera del catálogo', () => {
  /*
   * Columnas cifradas en la aplicación con AES-256-GCM (encryptedColumn(),
   * apps/api/src/crypto/encrypted-column.ts): el rol `whatsapp_bot` no puede
   * descifrarlas y el bot no debe ver ciphertext base64. La lista debe
   * mantenerse al día con cada nueva columna cifrada del esquema:
   *   paciente.nombre, paciente.cedula (paciente.entity.ts)
   *   detalle_orden.observaciones (detalle-orden.entity.ts)
   *   cuenta_cobro.observaciones (cuenta-cobro.entity.ts)
   *   pago.referencia, pago.notas (pago.entity.ts)
   *   usuario.nombre (usuario.entity.ts: el bot ni siquiera tiene la tabla)
   * Si se cifra una columna nueva, agregarla aquí y auditar el SQL del bot.
   */
  const CIFRADAS = ['p.nombre', 'p.cedula', 'dt.observaciones', 'cc.observaciones', 'referencia', 'notas']

  it('el SQL de ninguna herramienta menciona una columna cifrada', () => {
    for (const h of Object.values(HERRAMIENTAS)) {
      for (const col of CIFRADAS) {
        expect(`${h.nombre}: ${h.sql}`).not.toContain(col)
      }
    }
  })

  it('los pacientes llegan por la API, no por SQL del bot', () => {
    expect('listar_pacientes_doctor' in HERRAMIENTAS).toBe(false)
    expect(Object.keys(HERRAMIENTAS)).not.toContain('paciente')
  })
})

describe('límites y negativas', () => {
  it('un nombre de herramienta desconocido se rechaza sin tocar la base', async () => {
    const { pool, registros } = poolFalso()
    const datos = new DatosBot(CONFIG, pool)
    const r = await ejecutarHerramienta(datos, '42', { nombre: 'DELETE FROM orden', entrada: '' })
    expect(r.ok).toBe(false)
    expect(registros).toEqual([])
  })

  it('un parámetro con SQL dentro se rechaza antes de ejecutar', async () => {
    const { pool, registros } = poolFalso()
    const datos = new DatosBot(CONFIG, pool)
    for (const entrada of ["1 OR 1=1", "1; DROP TABLE orden", "'; SELECT pg_sleep(10); --"]) {
      const r = await ejecutarHerramienta(datos, '42', { nombre: 'estado_orden', entrada })
      expect(r.ok).toBe(false)
    }
    expect(registros).toEqual([])
  })

  it('aplica el tope de filas por herramienta', async () => {
    const muchas = Array.from({ length: 80 }, (_, i) => ({ id: i }))
    const { pool } = poolFalso(muchas)
    const datos = new DatosBot(CONFIG, pool)
    const r = await ejecutarHerramienta(datos, '42', { nombre: 'listar_servicios', entrada: null })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.filas.length).toBe(HERRAMIENTAS.listar_servicios.tope)
  })

  it('una fila única vacía responde "no encontré"', async () => {
    const { pool } = poolFalso([])
    const datos = new DatosBot(CONFIG, pool)
    const r = await ejecutarHerramienta(datos, '42', { nombre: 'estado_orden', entrada: '999' })
    expect(r).toEqual({ ok: false, texto: NO_ENCONTRADO })
  })

  it('un error de la base degrada a no disponible y hace ROLLBACK', async () => {
    const registros: Registro[] = []
    const cliente: ClientePg = {
      query: async (sql, values) => {
        registros.push({ sql, values })
        if (sql.includes('FROM orden')) throw new Error('boom')
        return { rows: [] }
      },
      release: () => {},
    }
    const datos = new DatosBot(CONFIG, { connect: async () => cliente })
    const r = await ejecutarHerramienta(datos, '42', { nombre: 'estado_orden', entrada: '1' })
    expect(r).toEqual({ ok: false, texto: NO_DISPONIBLE })
    expect(registros.some((x) => x.sql === 'ROLLBACK')).toBe(true)
  })
})

describe('indisponibilidad degradada', () => {
  it('sin configuración responde "no disponible" y jamás se conecta', async () => {
    let conecto = false
    const datos = new DatosBot(null, {
      connect: async () => {
        conecto = true
        throw new Error('no debería conectarse')
      },
    })
    expect(datos.disponible()).toBe(false)
    const r = await ejecutarHerramienta(datos, '42', { nombre: 'estado_orden', entrada: '1' })
    expect(r).toEqual({ ok: false, texto: NO_DISPONIBLE })
    expect(conecto).toBe(false)
  })
})
