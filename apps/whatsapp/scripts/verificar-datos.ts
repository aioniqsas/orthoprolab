/**
 * Verificación en vivo del rol `whatsapp_bot` (IA2). Correr desde apps/whatsapp:
 *   bun --env-file=.env scripts/verificar-datos.ts
 * Solo imprime agregados y textos de error; nunca el DSN, la contraseña ni filas.
 */
import pg from 'pg'
import { configuracionDesdeEntorno } from '../src/datos'

const env = process.env as Record<string, string | undefined>
const cfg = configuracionDesdeEntorno(env)
if (!cfg) {
  const faltantes = ['WHATSAPP_DB_HOST', 'WHATSAPP_DB_PORT', 'WHATSAPP_DB_NAME', 'WHATSAPP_DB_USER', 'WHATSAPP_DB_PASSWORD'].filter(
    (k) => !env[k],
  )
  console.log(`FALTAN VARIABLES: ${faltantes.join(', ')}`)
  process.exit(2)
}

const pool = new pg.Pool({ ...cfg, max: 1 })

async function conClinica(clinicaId: string, fn: (c: pg.PoolClient) => Promise<void>): Promise<void> {
  const c = await pool.connect()
  try {
    await c.query('BEGIN')
    await c.query('SELECT set_config($1, $2, true)', ['app.clinica_id', clinicaId])
    await fn(c)
    await c.query('COMMIT')
  } finally {
    c.release()
  }
}

try {
  // 1. Descubrir una clínica real (probing de ids 1..50, sin imprimir filas).
  let clinica: string | null = null
  const c0 = await pool.connect()
  for (let id = 1; id <= 50; id++) {
    try {
      await c0.query('BEGIN')
      await c0.query('SELECT set_config($1, $2, true)', ['app.clinica_id', String(id)])
      const r = await c0.query('SELECT 1 FROM clinica WHERE id = $1', [id])
      if (r.rowCount && r.rowCount > 0) {
        clinica = String(id)
        await c0.query('COMMIT')
        break
      }
      await c0.query('COMMIT')
    } catch {
      await c0.query('ROLLBACK')
    }
  }
  c0.release()
  if (!clinica) {
    console.log('SIN CLINICA: no se encontró ninguna clínica en ids 1..50')
    process.exit(3)
  }

  // 2. Conteo de órdenes con app.clinica_id fijado.
  await conClinica(clinica, async (c) => {
    const r = await c.query('SELECT count(*)::int AS n FROM orden')
    console.log(`ORDENES clinica_id=${clinica}: ${r.rows[0]!.n}`)
  })

  // 3. Probes de denegación (transacciones independientes).
  const probes: Array<[string, string]> = [
    ['SELECT 1 FROM usuario LIMIT 1', 'usuario'],
    ['DELETE FROM orden WHERE false', 'DELETE orden'],
  ]
  for (const [sql, etiqueta] of probes) {
    const c = await pool.connect()
    try {
      const r = await c.query(sql)
      console.log(`PROBE ${etiqueta}: EJECUTADO (rowCount=${r.rowCount}) — FALLO DE SEGURIDAD`)
    } catch (e) {
      console.log(`PROBE ${etiqueta} rechazado: ${(e as Error).message}`)
    } finally {
      c.release()
    }
  }

  // 4. Sin SET LOCAL: una tabla con aislamiento por clínica debe verse vacía.
  const c2 = await pool.connect()
  try {
    const r = await c2.query('SELECT count(*)::int AS n FROM doctor')
    console.log(`DOCTOR sin app.clinica_id: ${r.rows[0]!.n} (esperado 0)`)
  } catch (e) {
    console.log(`DOCTOR sin app.clinica_id: error: ${(e as Error).message}`)
  } finally {
    c2.release()
  }
} finally {
  await pool.end()
}
