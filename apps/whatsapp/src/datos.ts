import pg from 'pg'

/**
 * Capa de datos de solo lectura del bot (IA2, S2). Se conecta con el rol
 * restringido `whatsapp_bot` (WHATSAPP_DB_*); nunca con el usuario de la API.
 * Si falta cualquier variable, la capa queda "no disponible" y todas las
 * herramientas responden NO_DISPONIBLE en vez de crashear el arranque.
 */

export interface DatosConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

export const NO_DISPONIBLE =
  'El servicio no está disponible en este momento. Vuelve a intentarlo en un rato.'

/** El contacto verificado no trae clínica: se niega la consulta. */
export const SIN_CLINICA =
  'No pude identificar tu clínica. Escríbele al laboratorio para que te vincule al bot.'

export const NO_ENCONTRADO = 'No encontré ese registro.'

/** Variables de entorno requeridas para el rol del bot (S4). */
export function configuracionDesdeEntorno(env: Record<string, string | undefined> = process.env): DatosConfig | null {
  const { WHATSAPP_DB_HOST, WHATSAPP_DB_PORT, WHATSAPP_DB_NAME, WHATSAPP_DB_USER, WHATSAPP_DB_PASSWORD } = env
  if (!WHATSAPP_DB_HOST || !WHATSAPP_DB_PORT || !WHATSAPP_DB_NAME || !WHATSAPP_DB_USER || !WHATSAPP_DB_PASSWORD) return null
  const port = Number(WHATSAPP_DB_PORT)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null
  return { host: WHATSAPP_DB_HOST, port, database: WHATSAPP_DB_NAME, user: WHATSAPP_DB_USER, password: WHATSAPP_DB_PASSWORD }
}

/** Superficie mínima de `pg.PoolClient` que usa la capa (falsificable en pruebas). */
export interface ClientePg {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>
  release(err?: boolean): void
}

export interface PoolPg {
  connect(): Promise<ClientePg>
}

export type Filas = Record<string, unknown>

/** Contexto de una conversación: el `q` solo corre dentro de la transacción con clínica. */
export interface Ejecutor {
  query(sql: string, values?: unknown[]): Promise<Filas[]>
}

export class DatosBot {
  private pool: PoolPg | null

  constructor(
    private readonly config: DatosConfig | null,
    pool?: PoolPg,
  ) {
    this.pool = pool ?? null
  }

  /** False cuando falta alguna variable: toda herramienta responde NO_DISPONIBLE. */
  disponible(): boolean {
    return this.config !== null
  }

  private getPool(): PoolPg {
    if (!this.pool) {
      const cfg = this.config
      if (!cfg) throw new Error('capa de datos sin configuración')
      this.pool = new pg.Pool({
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.user,
        password: cfg.password,
        max: 2,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
      })
    }
    return this.pool
  }

  /**
   * Corre `fn` dentro de una transacción con el aislamiento por clínica (S2):
   * BEGIN; SET LOCAL del GUC `app.clinica_id` (vía set_config parametrizado,
   * equivalente transaccional de `SET LOCAL app.clinica_id = '...'`) y un
   * statement_timeout propio; COMMIT al final, ROLLBACK ante error. La clínica
   * viene del contacto verificado, nunca del modelo.
   */
  async transaccion<T>(clinicaId: string | undefined, fn: (q: Ejecutor) => Promise<T>): Promise<T> {
    if (!this.disponible()) throw new Error(NO_DISPONIBLE)
    if (!clinicaId || !/^\d{1,18}$/.test(clinicaId)) throw new Error(SIN_CLINICA)
    const cliente = await this.getPool().connect()
    try {
      await cliente.query('BEGIN')
      // SET LOCAL no admite parámetros: set_config(..., true) es su forma
      // parametrizada y solo dura hasta COMMIT/ROLLBACK.
      await cliente.query('SELECT set_config($1, $2, true)', ['app.clinica_id', clinicaId])
      await cliente.query("SELECT set_config($1, '5s', true)", ['statement_timeout'])
      const q: Ejecutor = {
        query: async (sql, values) => (await cliente.query(sql, values)).rows as Filas[],
      }
      const resultado = await fn(q)
      await cliente.query('COMMIT')
      return resultado
    } catch (error) {
      try {
        await cliente.query('ROLLBACK')
      } catch {
        // la conexión ya está rota; se libera igual.
      }
      throw error
    } finally {
      cliente.release()
    }
  }
}
