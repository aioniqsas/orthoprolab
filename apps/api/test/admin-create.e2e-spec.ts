/**
 * Integration test of the first-administrator bootstrap against live
 * PostgreSQL and Redis (`bun run infra:up`, migrations applied). Creates a
 * throwaway administrator, proves it can log in through the real app, and
 * removes every created row afterwards. Passwords are generated per run and
 * never printed.
 */
import { randomBytes, randomInt } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { compare } from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { APP_CREATE_OPTIONS, configureApp } from './../src/app.setup.js';
import {
  AdminCreateError,
  createAdministrator,
  typeormAdminStore,
  type AdminDeps,
} from './../src/auth/admin-bootstrap.js';
import { PasswordService } from './../src/crypto/password.service.js';
import { cedulaHash } from './../src/crypto/cedula.js';

vi.hoisted(() => {
  process.env.TRUST_PROXY = '1';
});

const freshIp = () =>
  `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;

describe('admin bootstrap (e2e)', () => {
  let app: NestExpressApplication;
  let ds: DataSource;
  let deps: AdminDeps;
  const password = randomBytes(18).toString('base64url');
  const correo = `admin-e2e-${randomBytes(6).toString('hex')}@test.local`;
  const cedula = String(randomInt(10_000_000_000, 99_999_999_999));
  const input = {
    nombres: 'Admin',
    apellidos: 'Prueba',
    cedula,
    correo,
    password,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app =
      moduleRef.createNestApplication<NestExpressApplication>(
        APP_CREATE_OPTIONS,
      );
    configureApp(app);
    await app.init();
    ds = app.get(DataSource);
    deps = {
      passwords: app.get(PasswordService),
      store: typeormAdminStore(ds),
    };
  });

  afterAll(async () => {
    await ds.query(
      `DELETE FROM sesion_refresco WHERE usuario_id IN (SELECT id FROM usuario WHERE correo LIKE 'admin-e2e-%')`,
    );
    await ds.query(`DELETE FROM usuario WHERE correo LIKE 'admin-e2e-%'`);
    await app.close();
  });

  it('creates an active administrator with a hashed password and encrypted cedula', async () => {
    const created = await createAdministrator(deps, input);
    expect(created).toMatchObject({ correo, rol: 'administrador' });
    expect(JSON.stringify(created)).not.toContain(password);

    const rows: Array<{
      rol: string;
      activo: boolean;
      password_hash: string;
      cedula: string;
      cedula_hash: string;
      doctors: string;
    }> = await ds.query(
      `SELECT r.nombre AS rol, u.activo, u.password_hash, u.cedula, u.cedula_hash,
              (SELECT count(*) FROM doctor d WHERE d.usuario_id = u.id) AS doctors
         FROM usuario u JOIN rol r ON r.id = u.rol_id WHERE u.id = $1`,
      [created.id],
    );
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.rol).toBe('administrador');
    expect(row.activo).toBe(true);
    expect(Number(row.doctors)).toBe(0);
    expect(row.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(row.password_hash).not.toContain(password);
    expect(row.cedula).not.toContain(cedula);
    expect(row.cedula_hash).toBe(cedulaHash(cedula));
    // The stored value is the bcrypt of the SHA-256 pre-hash, not of the raw text.
    expect(await compare(password, row.password_hash)).toBe(false);
  });

  it('can log in through the real app and /auth/me reports the role', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/auth/login')
      .set('X-Forwarded-For', freshIp())
      .send({ correo, password })
      .expect(200);
    expect(JSON.stringify(login.body)).not.toContain(password);

    const me = await agent
      .get('/auth/me')
      .set('X-Forwarded-For', freshIp())
      .expect(200);
    expect(me.body).toMatchObject({ correo, rol: 'administrador' });
  });

  it('refuses a second creation with the same email', async () => {
    const error = await createAdministrator(deps, {
      ...input,
      cedula: String(randomInt(10_000_000_000, 99_999_999_999)),
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminCreateError);
    expect((error as AdminCreateError).code).toBe('duplicate');
    expect((error as AdminCreateError).details).toContain('correo');
  });

  it('refuses a second creation with the same cedula', async () => {
    const error = await createAdministrator(deps, {
      ...input,
      correo: `admin-e2e-${randomBytes(6).toString('hex')}@test.local`,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminCreateError);
    expect((error as AdminCreateError).code).toBe('duplicate');
    expect((error as AdminCreateError).details).toContain('cedula');

    const [{ n }] = await ds.query(
      `SELECT count(*)::int AS n FROM usuario WHERE correo LIKE 'admin-e2e-%'`,
    );
    expect(n).toBe(1);
  });
});
