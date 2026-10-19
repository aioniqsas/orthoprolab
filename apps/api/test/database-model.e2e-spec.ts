/**
 * Integration test of the relational model against the live PostgreSQL.
 * Requires `bun run infra:up` (repo root) and apps/api/.env. Migrations are
 * applied by the setup below (idempotent). Every test runs inside a
 * transaction that is rolled back, so the database is left untouched.
 */
import { DataSource, QueryRunner } from 'typeorm';
import { validateEnv } from './../src/config/env.validation.js';
import { CryptoService } from './../src/crypto/crypto.service.js';

type Row = Record<string, string>;

// Vite-only API (statically replaced by Vitest, so it must be called as
// import.meta.glob); the ImportMeta typing is widened locally.
const migrationModules = (
  import.meta as unknown as {
    glob: (
      pattern: string,
      opts: { eager: true },
    ) => Record<string, Record<string, new () => object>>;
  }
).glob('../src/database/migrations/*.ts', { eager: true });
const migrations = Object.values(migrationModules).flatMap((m) =>
  Object.values(m),
);

describe('Database model (integration)', () => {
  let ds: DataSource;
  let qr: QueryRunner;
  let crypto: CryptoService;

  beforeAll(async () => {
    process.loadEnvFile('.env');
    const env = validateEnv(process.env);
    crypto = new CryptoService({
      encryptionKey: env.ENCRYPTION_KEY,
      blindIndexKey: env.BLIND_INDEX_KEY,
    });
    ds = new DataSource({
      type: 'postgres',
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      username: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      migrations: migrations as never[],
    });
    await ds.initialize();
    await ds.runMigrations();
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  beforeEach(async () => {
    qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
  });

  afterEach(async () => {
    await qr.rollbackTransaction();
    await qr.release();
  });

  // --- helpers -------------------------------------------------------------
  let seq = 0;
  const uniq = () => `${Date.now()}${++seq}`;

  async function one(sql: string, params: unknown[] = []): Promise<Row> {
    const rows = (await qr.query(sql, params)) as Row[];
    return rows[0];
  }

  /** Runs a statement expected to fail; returns the PostgreSQL error code. */
  async function failCode(sql: string, params: unknown[] = []) {
    await qr.query('SAVEPOINT attempt');
    try {
      await qr.query(sql, params);
    } catch (e) {
      await qr.query('ROLLBACK TO SAVEPOINT attempt');
      return (e as { driverError?: { code?: string } }).driverError?.code;
    }
    await qr.query('RELEASE SAVEPOINT attempt');
    return undefined;
  }

  const UNIQUE = '23505';
  const FK = '23503';
  const CHECK = '23514';

  async function rol() {
    return one(`INSERT INTO rol (nombre) VALUES ($1) RETURNING id`, [
      `rol-${uniq()}`,
    ]);
  }

  // Personal data is protected by the app: the DB only receives ciphertext
  // plus the blind index (cedula_hash), which carries uniqueness.
  const usuarioSql = `INSERT INTO usuario (cedula, cedula_hash, nombres, apellidos, correo, password_hash, rol_id)
       VALUES ($1, $2, 'N', 'A', $3, 'hash', $4)`;
  const cedulaCols = (cedula: string) => [
    crypto.encrypt(cedula),
    crypto.blindIndex(cedula),
  ];

  async function usuario(correo = `u${uniq()}@x.co`, cedula = `c${uniq()}`) {
    const r = await rol();
    return one(`${usuarioSql} RETURNING id`, [
      ...cedulaCols(cedula),
      correo,
      r.id,
    ]);
  }

  async function doctor() {
    const u = await usuario();
    await qr.query(`INSERT INTO doctor (usuario_id) VALUES ($1)`, [u.id]);
    return u.id;
  }

  async function paciente(cedula: string | null = null) {
    return one(
      `INSERT INTO paciente (nombre, cedula, cedula_hash) VALUES ($1, $2, $3) RETURNING id`,
      [
        crypto.encrypt('P'),
        cedula === null ? null : crypto.encrypt(cedula),
        cedula === null ? null : crypto.blindIndex(cedula),
      ],
    );
  }

  async function estado() {
    return one(
      `INSERT INTO estado_orden (codigo, nombre, posicion) VALUES ($1, 'E', 99)
       RETURNING id`,
      [`e-${uniq()}`],
    );
  }

  async function servicio(precio = '100.00') {
    return one(
      `INSERT INTO servicio (nombre, precio) VALUES ($1, $2) RETURNING id`,
      [`s-${uniq()}`, precio],
    );
  }

  /** doctor + assigned patient + state, ready to create orders. */
  async function ordenBase() {
    const doctorId = await doctor();
    const p = await paciente();
    await qr.query(
      `INSERT INTO paciente_doctor (paciente_id, doctor_id) VALUES ($1, $2)`,
      [p.id, doctorId],
    );
    const e = await estado();
    return { doctorId, pacienteId: p.id, estadoId: e.id };
  }

  async function orden(extra = '', params: unknown[] = []) {
    const b = await ordenBase();
    return {
      ...b,
      row: await one(
        `INSERT INTO orden (doctor_id, paciente_id, estado_id${extra ? ', ' + extra.split('=')[0] : ''})
         VALUES ($1, $2, $3${extra ? ', $4' : ''}) RETURNING id`,
        [b.doctorId, b.pacienteId, b.estadoId, ...params],
      ),
    };
  }

  // --- tests ---------------------------------------------------------------
  describe('usuario', () => {
    it('rejects a duplicate cedula (via blind index)', async () => {
      const u = await usuario(undefined, 'dup-1');
      expect(u.id).toBeDefined();
      const r = await rol();
      // Same id with different formatting maps to the same blind index.
      const code = await failCode(usuarioSql, [
        ...cedulaCols('DUP.1'),
        `o${uniq()}@x.co`,
        r.id,
      ]);
      expect(code).toBe(UNIQUE);
    });

    it('rejects a duplicate correo regardless of case', async () => {
      await usuario('Ana@Example.com');
      const r = await rol();
      const code = await failCode(usuarioSql, [
        ...cedulaCols(`c${uniq()}`),
        'ana@example.COM',
        r.id,
      ]);
      expect(code).toBe(UNIQUE);
    });
  });

  describe('doctor', () => {
    it('rejects a doctor for a non-existent usuario', async () => {
      const code = await failCode(
        `INSERT INTO doctor (usuario_id) VALUES (gen_random_uuid())`,
      );
      expect(code).toBe(FK);
    });
  });

  describe('asistente_doctor', () => {
    it('rejects doctor equal to asistente', async () => {
      const d = await doctor();
      const code = await failCode(
        `INSERT INTO asistente_doctor (doctor_id, asistente_id) VALUES ($1, $1)`,
        [d],
      );
      expect(code).toBe(CHECK);
    });

    it('rejects a duplicate assignment', async () => {
      const d = await doctor();
      const a = await usuario();
      await qr.query(
        `INSERT INTO asistente_doctor (doctor_id, asistente_id) VALUES ($1, $2)`,
        [d, a.id],
      );
      const code = await failCode(
        `INSERT INTO asistente_doctor (doctor_id, asistente_id) VALUES ($1, $2)`,
        [d, a.id],
      );
      expect(code).toBe(UNIQUE);
    });
  });

  describe('paciente', () => {
    it('enforces unique cedula but allows many NULL cedulas', async () => {
      await paciente('p-1');
      expect(
        await failCode(
          `INSERT INTO paciente (nombre, cedula, cedula_hash) VALUES ($1, $2, $3)`,
          [
            crypto.encrypt('X'),
            crypto.encrypt('P 1'),
            crypto.blindIndex('p-1'),
          ],
        ),
      ).toBe(UNIQUE);
      await paciente(null);
      await paciente(null);
    });
  });

  describe('orden', () => {
    it('accepts an order for an assigned patient', async () => {
      const { row } = await orden();
      expect(row.id).toBeDefined();
    });

    it('rejects a patient not assigned to the doctor', async () => {
      const b = await ordenBase();
      const other = await paciente();
      const code = await failCode(
        `INSERT INTO orden (doctor_id, paciente_id, estado_id) VALUES ($1, $2, $3)`,
        [b.doctorId, other.id, b.estadoId],
      );
      expect(code).toBe(FK);
    });

    it('rejects a negative valor', async () => {
      const b = await ordenBase();
      const code = await failCode(
        `INSERT INTO orden (doctor_id, paciente_id, estado_id, valor) VALUES ($1, $2, $3, -1)`,
        [b.doctorId, b.pacienteId, b.estadoId],
      );
      expect(code).toBe(CHECK);
    });

    it('rejects fecha_entrega before fecha_creacion', async () => {
      const b = await ordenBase();
      const code = await failCode(
        `INSERT INTO orden (doctor_id, paciente_id, estado_id, fecha_creacion, fecha_entrega)
         VALUES ($1, $2, $3, now(), now() - interval '1 day')`,
        [b.doctorId, b.pacienteId, b.estadoId],
      );
      expect(code).toBe(CHECK);
    });

    it('defaults valor to 0 and urgente to false', async () => {
      const { row } = await orden();
      const o = await one(`SELECT valor, urgente FROM orden WHERE id = $1`, [
        row.id,
      ]);
      expect(o.valor).toBe('0.00');
      expect(o.urgente).toBe(false);
    });
  });

  describe('detalle_orden', () => {
    it('rejects cantidad 0', async () => {
      const { row } = await orden();
      const s = await servicio();
      const code = await failCode(
        `INSERT INTO detalle_orden (orden_id, servicio_id, cantidad, precio_unitario)
         VALUES ($1, $2, 0, 10)`,
        [row.id, s.id],
      );
      expect(code).toBe(CHECK);
    });

    it('rejects a negative precio_unitario', async () => {
      const { row } = await orden();
      const s = await servicio();
      const code = await failCode(
        `INSERT INTO detalle_orden (orden_id, servicio_id, precio_unitario)
         VALUES ($1, $2, -5)`,
        [row.id, s.id],
      );
      expect(code).toBe(CHECK);
    });

    it('keeps the historical price when the service price changes', async () => {
      const { row } = await orden();
      const s = await servicio('100.00');
      const d = await one(
        `INSERT INTO detalle_orden (orden_id, servicio_id, precio_unitario)
         SELECT $1, id, precio FROM servicio WHERE id = $2 RETURNING id`,
        [row.id, s.id],
      );
      await qr.query(`UPDATE servicio SET precio = 250.00 WHERE id = $1`, [
        s.id,
      ]);
      const after = await one(
        `SELECT precio_unitario FROM detalle_orden WHERE id = $1`,
        [d.id],
      );
      expect(after.precio_unitario).toBe('100.00');
    });
  });

  describe('servicio', () => {
    it('rejects a negative precio', async () => {
      expect(
        await failCode(
          `INSERT INTO servicio (nombre, precio) VALUES ('neg', -1)`,
        ),
      ).toBe(CHECK);
    });
  });

  describe('historial_estado_orden', () => {
    it('stores several transitions for one order in chronological order', async () => {
      const { row, estadoId } = await orden();
      const u = await usuario();
      const e2 = await estado();
      const e3 = await estado();
      const ins = `INSERT INTO historial_estado_orden
        (orden_id, estado_anterior_id, estado_nuevo_id, usuario_id, fecha_cambio)
        VALUES ($1, $2, $3, $4, $5)`;
      await qr.query(ins, [
        row.id,
        null,
        estadoId,
        u.id,
        '2026-01-01T10:00:00Z',
      ]);
      await qr.query(ins, [
        row.id,
        estadoId,
        e2.id,
        u.id,
        '2026-01-02T10:00:00Z',
      ]);
      await qr.query(ins, [row.id, e2.id, e3.id, u.id, '2026-01-03T10:00:00Z']);
      const rows = (await qr.query(
        `SELECT estado_nuevo_id FROM historial_estado_orden
         WHERE orden_id = $1 ORDER BY fecha_cambio`,
        [row.id],
      )) as Row[];
      expect(rows.map((r) => r.estado_nuevo_id)).toEqual([
        estadoId,
        e2.id,
        e3.id,
      ]);
    });
  });

  describe('seeds (provisional values, to be confirmed with the client)', () => {
    it('contains the 3 roles', async () => {
      const rows = (await qr.query(
        `SELECT nombre FROM rol WHERE nombre IN ('administrador','odontologo','asistente')`,
      )) as Row[];
      expect(rows).toHaveLength(3);
    });

    it('contains the 3 order states in flow order', async () => {
      const rows = (await qr.query(
        `SELECT codigo, posicion, es_final FROM estado_orden
         WHERE codigo IN ('recibida','en_produccion','terminada') ORDER BY posicion`,
      )) as unknown as {
        codigo: string;
        posicion: number;
        es_final: boolean;
      }[];
      expect(rows.map((r) => [r.codigo, r.posicion, r.es_final])).toEqual([
        ['recibida', 1, false],
        ['en_produccion', 2, false],
        ['terminada', 3, true],
      ]);
    });
  });
});
