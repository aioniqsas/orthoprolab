/**
 * Integration test of personal-data protection against the live PostgreSQL:
 * values are stored as `v1:` ciphertext, read back as plaintext through the
 * entities, and uniqueness/lookup go through the blind index. Each test runs
 * in a transaction that is rolled back.
 */
import { randomBytes } from 'node:crypto';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { validateEnv } from './../src/config/env.validation.js';
import {
  configureCrypto,
  resetCrypto,
} from './../src/crypto/crypto.registry.js';
import { CryptoService } from './../src/crypto/crypto.service.js';
import { cedulaHash } from './../src/crypto/cedula.js';
import { Usuario } from './../src/usuarios/usuario.entity.js';
import { Rol } from './../src/usuarios/rol.entity.js';
import { Paciente } from './../src/pacientes/paciente.entity.js';
import { DetalleOrden } from './../src/pedidos/detalle-orden.entity.js';
import { HistorialEstadoOrden } from './../src/pedidos/historial-estado-orden.entity.js';

type Modules = Record<string, Record<string, unknown>>;
type Glob = (pattern: string, opts: { eager: true }) => Modules;
// Vite-only API (statically replaced by Vitest): must be called as import.meta.glob.
const migrationModules = (import.meta as unknown as { glob: Glob }).glob(
  '../src/database/migrations/*.ts',
  { eager: true },
);
const entityModules = (import.meta as unknown as { glob: Glob }).glob(
  '../src/**/*.entity.ts',
  { eager: true },
);
const flat = (mods: Modules) =>
  Object.values(mods).flatMap((m) => Object.values(m));

type Row = Record<string, string | null>;

describe('Data protection (integration)', () => {
  let ds: DataSource;
  let qr: QueryRunner;
  let em: EntityManager;
  let crypto: CryptoService;
  let keys: { encryptionKey: string; blindIndexKey: string };

  beforeAll(async () => {
    process.loadEnvFile('.env');
    const env = validateEnv(process.env);
    keys = {
      encryptionKey: env.ENCRYPTION_KEY,
      blindIndexKey: env.BLIND_INDEX_KEY,
    };
    crypto = new CryptoService(keys);
    ds = new DataSource({
      type: 'postgres',
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      username: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      migrations: flat(migrationModules) as never[],
      entities: flat(entityModules).filter(
        (e) => typeof e === 'function',
      ) as never[],
      uuidExtension: 'pgcrypto',
      installExtensions: false,
    });
    await ds.initialize();
    await ds.runMigrations();
  });

  afterAll(async () => {
    resetCrypto();
    await ds?.destroy();
  });

  beforeEach(async () => {
    configureCrypto(crypto);
    qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    em = qr.manager;
  });

  afterEach(async () => {
    await qr.rollbackTransaction();
    await qr.release();
  });

  let seq = 0;
  const uniq = () => `${Date.now()}${++seq}`;

  async function raw(sql: string, params: unknown[] = []): Promise<Row[]> {
    return (await qr.query(sql, params)) as Row[];
  }

  async function newRol() {
    return em.save(Rol, em.create(Rol, { nombre: `rol-${uniq()}` }));
  }

  async function newUsuario(cedula = `1.${uniq()}`) {
    const rol = await newRol();
    return em.save(
      Usuario,
      em.create(Usuario, {
        cedula,
        nombres: 'Ana',
        apellidos: 'Gomez',
        correo: `u${uniq()}@x.co`,
        passwordHash: 'hash',
        rolId: rol.id,
      }),
    );
  }

  const looksEncrypted = (v: string | null) => v?.startsWith('v1:') === true;

  it('stores paciente nombre and cedula as ciphertext and reads plaintext back', async () => {
    const p = await em.save(
      Paciente,
      em.create(Paciente, { nombre: 'María Pérez', cedula: '52.123.456' }),
    );
    const [stored] = await raw(
      `SELECT nombre, cedula, cedula_hash FROM paciente WHERE id = $1`,
      [p.id],
    );
    expect(looksEncrypted(stored.nombre)).toBe(true);
    expect(looksEncrypted(stored.cedula)).toBe(true);
    expect(stored.nombre).not.toContain('Pérez');
    expect(stored.cedula).not.toContain('123.456');
    expect(stored.cedula_hash).toBe(cedulaHash('52123456'));

    const loaded = await em.findOneByOrFail(Paciente, { id: p.id });
    expect(loaded.nombre).toBe('María Pérez');
    expect(loaded.cedula).toBe('52.123.456');
  });

  it('stores usuario cedula as ciphertext and reads plaintext back', async () => {
    const u = await newUsuario('1.098.765.432');
    const [stored] = await raw(
      `SELECT cedula, cedula_hash FROM usuario WHERE id = $1`,
      [u.id],
    );
    expect(looksEncrypted(stored.cedula)).toBe(true);
    expect(stored.cedula).not.toContain('098');
    expect(stored.cedula_hash).toMatch(/^[0-9a-f]{64}$/);
    const loaded = await em.findOneByOrFail(Usuario, { id: u.id });
    expect(loaded.cedula).toBe('1.098.765.432');
  });

  it('stores observaciones of detalle_orden and historial as ciphertext', async () => {
    const note = 'Alergia a la penicilina';
    const detalle = em.create(DetalleOrden, { observaciones: note });
    const historial = em.create(HistorialEstadoOrden, { observaciones: note });
    // Check the transformer on the column metadata without needing a full order graph.
    for (const [entity, table] of [
      [DetalleOrden, 'detalle_orden'],
      [HistorialEstadoOrden, 'historial_estado_orden'],
    ] as const) {
      const col = ds
        .getMetadata(entity)
        .columns.find((c) => c.propertyName === 'observaciones')!;
      const stored = col.transformer
        ? ([] as unknown[]).concat(
            (col.transformer as { to: (v: string) => unknown }).to(note),
          )[0]
        : note;
      expect(looksEncrypted(stored as string)).toBe(true);
      expect(stored).not.toContain('penicilina');
      expect(
        (col.transformer as { from: (v: unknown) => unknown }).from(stored),
      ).toBe(note);
      expect(table).toBeDefined();
    }
    expect(detalle.observaciones).toBe(note);
    expect(historial.observaciones).toBe(note);
  });

  it('persists observaciones end to end as ciphertext (raw SQL)', async () => {
    const note = 'Alergia a la penicilina';
    const u = await newUsuario();
    const estado = (
      await raw(
        `INSERT INTO estado_orden (codigo, nombre, posicion) VALUES ($1,'E',99) RETURNING id`,
        [`e-${uniq()}`],
      )
    )[0];
    await qr.query(`INSERT INTO doctor (usuario_id) VALUES ($1)`, [u.id]);
    const p = await em.save(Paciente, em.create(Paciente, { nombre: 'P' }));
    await qr.query(
      `INSERT INTO paciente_doctor (paciente_id, doctor_id) VALUES ($1,$2)`,
      [p.id, u.id],
    );
    const orden = (
      await raw(
        `INSERT INTO orden (doctor_id, paciente_id, estado_id) VALUES ($1,$2,$3) RETURNING id`,
        [u.id, p.id, estado.id],
      )
    )[0];
    const servicio = (
      await raw(
        `INSERT INTO servicio (nombre, precio) VALUES ($1, 10) RETURNING id`,
        [`s-${uniq()}`],
      )
    )[0];
    const d = await em.save(
      DetalleOrden,
      em.create(DetalleOrden, {
        ordenId: orden.id!,
        servicioId: servicio.id!,
        precioUnitario: '10.00',
        observaciones: note,
      }),
    );
    const h = await em.save(
      HistorialEstadoOrden,
      em.create(HistorialEstadoOrden, {
        ordenId: orden.id!,
        estadoNuevoId: estado.id!,
        usuarioId: u.id,
        observaciones: note,
      }),
    );
    const [sd] = await raw(
      `SELECT observaciones FROM detalle_orden WHERE id=$1`,
      [d.id],
    );
    const [sh] = await raw(
      `SELECT observaciones FROM historial_estado_orden WHERE id=$1`,
      [h.id],
    );
    for (const s of [sd, sh]) {
      expect(looksEncrypted(s.observaciones)).toBe(true);
      expect(s.observaciones).not.toContain('penicilina');
    }
    const back = await em.findOneByOrFail(DetalleOrden, { id: d.id });
    expect(back.observaciones).toBe(note);
  });

  it('finds records by cedula_hash and never by the ciphertext', async () => {
    const u = await newUsuario('7.654.321');
    const found = await em.findOneBy(Usuario, {
      cedulaHash: cedulaHash('7654321'),
    });
    expect(found?.id).toBe(u.id);
    expect(found?.cedula).toBe('7.654.321');
    expect(
      await em.findOneBy(Usuario, { cedulaHash: cedulaHash('0000000') }),
    ).toBeNull();
  });

  it('rejects a duplicate usuario cedula even with different formatting', async () => {
    await newUsuario('1.234.567');
    const rol = await newRol();
    await qr.query('SAVEPOINT s');
    await expect(
      em.save(
        Usuario,
        em.create(Usuario, {
          cedula: '1234567',
          nombres: 'B',
          apellidos: 'B',
          correo: `d${uniq()}@x.co`,
          passwordHash: 'h',
          rolId: rol.id,
        }),
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
    await qr.query('ROLLBACK TO SAVEPOINT s');
  });

  it('rejects a duplicate paciente cedula but allows many patients without one', async () => {
    await em.save(
      Paciente,
      em.create(Paciente, { nombre: 'A', cedula: '1.234.567' }),
    );
    await qr.query('SAVEPOINT s');
    await expect(
      em.save(
        Paciente,
        em.create(Paciente, { nombre: 'B', cedula: '1234567' }),
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
    await qr.query('ROLLBACK TO SAVEPOINT s');

    await em.save(Paciente, em.create(Paciente, { nombre: 'C', cedula: null }));
    await em.save(Paciente, em.create(Paciente, { nombre: 'D', cedula: null }));
    const [{ n }] = await raw(
      `SELECT count(*)::text AS n FROM paciente WHERE cedula_hash IS NULL`,
    );
    expect(Number(n)).toBeGreaterThanOrEqual(2);
  });

  it('updates cedula_hash when the cedula changes', async () => {
    const p = await em.save(
      Paciente,
      em.create(Paciente, { nombre: 'A', cedula: '111' }),
    );
    p.cedula = '222';
    await em.save(p);
    const [stored] = await raw(`SELECT cedula_hash FROM paciente WHERE id=$1`, [
      p.id,
    ]);
    expect(stored.cedula_hash).toBe(cedulaHash('222'));
  });

  it('fails to decrypt after ENCRYPTION_KEY changes', async () => {
    const p = await em.save(
      Paciente,
      em.create(Paciente, { nombre: 'Secreto', cedula: '999' }),
    );
    configureCrypto(
      new CryptoService({
        encryptionKey: randomBytes(32).toString('base64'),
        blindIndexKey: keys.blindIndexKey,
      }),
    );
    await expect(em.findOneByOrFail(Paciente, { id: p.id })).rejects.toThrow(
      /decrypt/i,
    );
  });
});
