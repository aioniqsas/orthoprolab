/**
 * Integration test of the auth module against live PostgreSQL and Redis
 * (`bun run infra:up`, migrations applied, apps/api/.env in place). Test-only
 * settings are set in-process; .env is never modified. Created rows are
 * removed afterwards.
 */
import { randomBytes, randomInt } from 'node:crypto';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { APP_CREATE_OPTIONS, configureApp } from './../src/app.setup.js';
import { Roles } from './../src/auth/roles.decorator.js';

// ConfigModule.forRoot() validates env at import time.
vi.hoisted(() => {
  process.env.TRUST_PROXY = '1';
  process.env.LOGIN_LOCK_SECONDS = '3';
  process.env.REFRESH_REUSE_GRACE_SECONDS = '10';
});

@Controller('_t')
class TestController {
  @Get('admin-only')
  @Roles('administrador')
  adminOnly() {
    return { ok: true };
  }

  @Get('doctor-or-admin')
  @Roles('odontologo', 'administrador')
  either() {
    return { ok: true };
  }
}

const PASSWORD = 'correct horse battery';
const GENERIC_503 =
  'No pudimos completar el registro en este momento. Intentalo de nuevo mas tarde.';
const freshIp = () =>
  `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
const email = () => `auth-e2e-${randomBytes(6).toString('hex')}@test.local`;
const cedula = () => String(randomInt(10_000_000, 999_999_999));

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let config: ConfigService;
  const http = () => request(app.getHttpServer());

  const registerBody = (over: Record<string, unknown> = {}) => ({
    nombres: 'Ana María',
    apellidos: "O'Brien-Pérez",
    cedula: cedula(),
    correo: email(),
    password: PASSWORD,
    ...over,
  });

  const register = (body = registerBody(), ip = freshIp()) =>
    http().post('/auth/register').set('X-Forwarded-For', ip).send(body);

  const login = (correo: string, password = PASSWORD, ip = freshIp()) =>
    http()
      .post('/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ correo, password });

  /** Cookie name -> raw Set-Cookie line. */
  const cookiesOf = (res: request.Response) => {
    const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
    return Object.fromEntries(
      (raw ?? []).map((line) => [line.split('=')[0], line]),
    ) as Record<string, string>;
  };
  const valueOf = (line: string) =>
    line.split(';')[0].split('=').slice(1).join('=');
  const cookieHeader = (jar: Record<string, string>, only?: string[]) =>
    Object.entries(jar)
      .filter(([k]) => !only || only.includes(k))
      .map(([k, v]) => `${k}=${valueOf(v)}`)
      .join('; ');

  async function registerAndLogin() {
    const body = registerBody();
    const ip = freshIp();
    await register(body, ip).expect(201);
    const res = await login(body.correo, PASSWORD, ip).expect(200);
    return { body, jar: cookiesOf(res), res };
  }

  const refreshWith = (refreshValue: string, ip = freshIp()) =>
    http()
      .post('/auth/refresh')
      .set('X-Forwarded-For', ip)
      .set('Cookie', `refresh_token=${refreshValue}`);

  const me = (cookie?: string, headers: Record<string, string> = {}) => {
    const r = http().get('/auth/me').set('X-Forwarded-For', freshIp());
    if (cookie) r.set('Cookie', cookie);
    for (const [k, v] of Object.entries(headers)) r.set(k, v);
    return r;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController],
    }).compile();
    app =
      moduleRef.createNestApplication<NestExpressApplication>(
        APP_CREATE_OPTIONS,
      );
    configureApp(app);
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    config = app.get(ConfigService);
  });

  afterAll(async () => {
    await ds.query(
      `DELETE FROM sesion_refresco WHERE usuario_id IN (SELECT id FROM usuario WHERE correo LIKE 'auth-e2e-%')`,
    );
    await ds.query(
      `DELETE FROM doctor WHERE usuario_id IN (SELECT id FROM usuario WHERE correo LIKE 'auth-e2e-%')`,
    );
    await ds.query(`DELETE FROM usuario WHERE correo LIKE 'auth-e2e-%'`);
    await app.close();
  });

  describe('public routes and defaults', () => {
    it('keeps / and /health public', async () => {
      await http().get('/').set('X-Forwarded-For', freshIp()).expect(200);
      await http().get('/health').set('X-Forwarded-For', freshIp()).expect(200);
    });

    it('protects every other route by default', async () => {
      await http()
        .get('/_t/admin-only')
        .set('X-Forwarded-For', freshIp())
        .expect(401);
    });
  });

  describe('POST /auth/register', () => {
    it('creates an odontologo with a doctor profile and sets no cookies', async () => {
      const body = registerBody();
      const res = await register(body).expect(201);
      expect(res.body).toEqual({ message: 'Registro completado.' });
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(res.headers['cache-control']).toBe('no-store');

      const rows = (await ds.query(
        `SELECT u.password_hash, u.activo, r.nombre AS rol, d.clinica_id, d.usuario_id
           FROM usuario u JOIN rol r ON r.id = u.rol_id
           LEFT JOIN doctor d ON d.usuario_id = u.id
          WHERE u.correo = $1`,
        [body.correo],
      )) as Array<{
        password_hash: string;
        activo: boolean;
        rol: string;
        clinica_id: string | null;
        usuario_id: string | null;
      }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].rol).toBe('odontologo');
      expect(rows[0].activo).toBe(true);
      expect(rows[0].usuario_id).not.toBeNull();
      expect(rows[0].clinica_id).toBeNull();
      expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
      expect(rows[0].password_hash).not.toContain(PASSWORD);
    });

    it('answers the same 503 for a duplicate email (any case) and a duplicate cedula', async () => {
      const first = registerBody();
      await register(first).expect(201);
      const dupEmail = await register(
        registerBody({ correo: first.correo.toUpperCase() }),
      ).expect(503);
      const dupCedula = await register(
        registerBody({ cedula: first.cedula }),
      ).expect(503);
      expect(dupEmail.body).toEqual(dupCedula.body);
      expect(dupEmail.body.message).toBe(GENERIC_503);
      expect(JSON.stringify(dupEmail.body)).not.toMatch(/correo|cedula|exist/i);
    });

    it.each([
      ['short password', { password: 'a'.repeat(11) }],
      ['oversized password', { password: 'a'.repeat(201) }],
      ['extra rol field', { rol: 'administrador' }],
      ['bad cedula', { cedula: 'abc' }],
      ['bad email', { correo: 'nope' }],
    ])('rejects %s with 400', async (_name, over) => {
      await register(registerBody(over)).expect(400);
    });

    it('accepts a 200 character password', async () => {
      const body = registerBody({ password: 'p'.repeat(200) });
      await register(body).expect(201);
      await login(body.correo, 'p'.repeat(200)).expect(200);
    });

    it('is rate limited', async () => {
      const ip = freshIp();
      const codes: number[] = [];
      for (let i = 0; i < 7; i++) {
        codes.push(
          (await register(registerBody({ password: 'x' }), ip)).status,
        );
      }
      expect(codes.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
      expect(codes[6]).toBe(429);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in and sets both cookies with the exact attributes', async () => {
      const { body, res } = await registerAndLogin();
      expect(res.body).toEqual({
        usuario: {
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          nombres: 'Ana María',
          apellidos: "O'Brien-Pérez",
          correo: body.correo,
          rol: 'odontologo',
        },
      });
      expect(res.headers['cache-control']).toBe('no-store');
      const jar = cookiesOf(res);
      expect(Object.keys(jar).sort()).toEqual(['auth_token', 'refresh_token']);
      expect(jar.auth_token).toMatch(/; Path=\/;/);
      expect(jar.auth_token).toContain('Max-Age=900');
      expect(jar.auth_token).toContain('HttpOnly');
      expect(jar.auth_token).toContain('SameSite=Strict');
      expect(jar.auth_token).not.toContain('Secure');
      expect(jar.refresh_token).toContain('Path=/auth');
      expect(jar.refresh_token).toContain('Max-Age=604800');
      expect(jar.refresh_token).toContain('HttpOnly');
      expect(jar.refresh_token).toContain('SameSite=Strict');
      expect(jar.refresh_token).not.toContain('Secure');
      expect(valueOf(jar.refresh_token).length).toBeGreaterThanOrEqual(43);
      expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);

      const stored = (await ds.query(
        `SELECT token_hash FROM sesion_refresco WHERE token_hash = encode(sha256($1::bytea), 'hex')`,
        [Buffer.from(valueOf(jar.refresh_token))],
      )) as unknown[];
      expect(stored).toHaveLength(1);
    });

    it('answers unknown email and wrong password identically', async () => {
      const { body } = await registerAndLogin();
      const wrong = await login(body.correo, 'wrong password!!').expect(401);
      const unknown = await login(email(), 'wrong password!!').expect(401);
      expect(unknown.body).toEqual(wrong.body);
      expect(wrong.headers['set-cookie']).toBeUndefined();
    });

    it('locks after 3 failures even for the correct password, then unlocks', async () => {
      const { body } = await registerAndLogin();
      for (let i = 0; i < 3; i++) {
        await login(body.correo, 'bad password 12').expect(401);
      }
      const locked = await login(body.correo).expect(429);
      expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
      expect(Number(locked.headers['retry-after'])).toBeLessThanOrEqual(3);
      expect(locked.headers['set-cookie']).toBeUndefined();
      await new Promise((r) => setTimeout(r, 3300));
      await login(body.correo).expect(200);
    }, 15_000);

    it('locks unknown emails too (no enumeration)', async () => {
      const ghost = email();
      for (let i = 0; i < 3; i++)
        await login(ghost, 'bad password 12').expect(401);
      await login(ghost, 'bad password 12').expect(429);
    });

    it('a successful login resets the failure counter', async () => {
      const { body } = await registerAndLogin();
      await login(body.correo, 'bad password 12').expect(401);
      await login(body.correo, 'bad password 12').expect(401);
      await login(body.correo).expect(200);
      await login(body.correo, 'bad password 12').expect(401);
      await login(body.correo, 'bad password 12').expect(401);
      await login(body.correo).expect(200);
    });

    it('rejects an inactive user with the generic 401', async () => {
      const { body } = await registerAndLogin();
      await ds.query(`UPDATE usuario SET activo = false WHERE correo = $1`, [
        body.correo,
      ]);
      const res = await login(body.correo).expect(401);
      const unknown = await login(email()).expect(401);
      expect(res.body).toEqual(unknown.body);
    });

    it('is rate limited per IP', async () => {
      const ip = freshIp();
      let last = 0;
      for (let i = 0; i < 12; i++) {
        last = (await login(email(), 'bad password 12', ip)).status;
      }
      expect(last).toBe(429);
    });
  });

  describe('GET /auth/me and the JWT cookie', () => {
    it('returns the profile for a valid cookie', async () => {
      const { body, jar } = await registerAndLogin();
      const res = await me(cookieHeader(jar, ['auth_token'])).expect(200);
      expect(res.body).toEqual({
        id: expect.any(String),
        nombres: 'Ana María',
        apellidos: "O'Brien-Pérez",
        correo: body.correo,
        rol: 'odontologo',
      });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('rejects a request without cookie', async () => {
      await me().expect(401);
    });

    it('ignores a token sent only in the Authorization header', async () => {
      const { jar } = await registerAndLogin();
      await me(undefined, {
        Authorization: `Bearer ${valueOf(jar.auth_token)}`,
      }).expect(401);
    });

    it('rejects a tampered token', async () => {
      const { jar } = await registerAndLogin();
      const t = valueOf(jar.auth_token);
      const tampered = `${t.slice(0, -4)}${t.endsWith('AAAA') ? 'BBBB' : 'AAAA'}`;
      await me(`auth_token=${tampered}`).expect(401);
    });

    it('rejects an expired token', async () => {
      const { jar } = await registerAndLogin();
      const payload = jwt.decode<{ sub: string; rol: string; sid: string }>(
        valueOf(jar.auth_token),
      );
      const expired = await jwt.signAsync(
        { sub: payload.sub, rol: payload.rol, sid: payload.sid },
        { expiresIn: -60 },
      );
      await me(`auth_token=${expired}`).expect(401);
    });

    it('rejects a token signed with another secret or algorithm none', async () => {
      const { jar } = await registerAndLogin();
      const payload = jwt.decode<{ sub: string; rol: string; sid: string }>(
        valueOf(jar.auth_token),
      );
      const foreign = new JwtService({ secret: 'another-secret-value-123456' });
      await me(
        `auth_token=${await foreign.signAsync({ sub: payload.sub, rol: payload.rol, sid: payload.sid })}`,
      ).expect(401);
      const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: payload.sub, rol: payload.rol, sid: payload.sid })).toString('base64url')}.`;
      await me(`auth_token=${none}`).expect(401);
    });

    it('rejects a deactivated user holding a valid token', async () => {
      const { body, jar } = await registerAndLogin();
      await ds.query(`UPDATE usuario SET activo = false WHERE correo = $1`, [
        body.correo,
      ]);
      await me(cookieHeader(jar, ['auth_token'])).expect(401);
    });

    it('signs HS256 with sub, rol and sid and a 15 minute lifetime', async () => {
      const { jar } = await registerAndLogin();
      const [h, p] = valueOf(jar.auth_token).split('.');
      expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toMatchObject({
        alg: 'HS256',
      });
      const claims = JSON.parse(
        Buffer.from(p, 'base64url').toString(),
      ) as Record<string, unknown>;
      expect(Object.keys(claims).sort()).toEqual(
        ['exp', 'iat', 'rol', 'sid', 'sub'].sort(),
      );
      expect((claims.exp as number) - (claims.iat as number)).toBe(900);
      expect(config.get('JWT_SECRET')).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates tokens, advances the expiry and rejects the old token', async () => {
      const { jar } = await registerAndLogin();
      const oldRefresh = valueOf(jar.refresh_token);
      const before = (await ds.query(
        `SELECT id, expira_en FROM sesion_refresco WHERE token_hash = encode(sha256($1::bytea), 'hex')`,
        [Buffer.from(oldRefresh)],
      )) as Array<{ id: string; expira_en: Date }>;
      await new Promise((r) => setTimeout(r, 50));

      const res = await refreshWith(oldRefresh).expect(200);
      expect(res.body).toEqual({ message: 'Sesion renovada.' });
      expect(res.headers['cache-control']).toBe('no-store');
      const next = cookiesOf(res);
      expect(valueOf(next.refresh_token)).not.toBe(oldRefresh);
      expect(valueOf(next.auth_token)).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(next.refresh_token).toContain('Path=/auth');
      expect(next.refresh_token).toContain('Max-Age=604800');

      const after = (await ds.query(
        `SELECT id, expira_en, revocada_en, reemplazada_por_id FROM sesion_refresco
          WHERE token_hash = encode(sha256($1::bytea), 'hex')`,
        [Buffer.from(valueOf(next.refresh_token))],
      )) as Array<{ id: string; expira_en: Date }>;
      expect(after[0].expira_en.getTime()).toBeGreaterThan(
        before[0].expira_en.getTime(),
      );
      const old = (await ds.query(
        `SELECT revocada_en, reemplazada_por_id FROM sesion_refresco WHERE id = $1`,
        [before[0].id],
      )) as Array<{ revocada_en: Date | null; reemplazada_por_id: string }>;
      expect(old[0].revocada_en).not.toBeNull();
      expect(old[0].reemplazada_por_id).toBe(after[0].id);

      await me(cookieHeader(next, ['auth_token'])).expect(200);
    });

    it('detects reuse outside the grace window and revokes the whole family', async () => {
      const { jar } = await registerAndLogin();
      const first = valueOf(jar.refresh_token);
      const rotated = await refreshWith(first).expect(200);
      const newest = valueOf(cookiesOf(rotated).refresh_token);

      await ds.query(
        `UPDATE sesion_refresco SET revocada_en = now() - interval '1 minute'
          WHERE token_hash = encode(sha256($1::bytea), 'hex')`,
        [Buffer.from(first)],
      );
      const reuse = await refreshWith(first).expect(401);
      const cleared = cookiesOf(reuse);
      expect(cleared.auth_token).toMatch(/auth_token=;/);
      expect(cleared.refresh_token).toMatch(/refresh_token=;/);

      await refreshWith(newest).expect(401);
    });

    it('tolerates a benign reuse inside the grace window without revoking', async () => {
      const { jar } = await registerAndLogin();
      const first = valueOf(jar.refresh_token);
      const rotated = await refreshWith(first).expect(200);
      const newest = valueOf(cookiesOf(rotated).refresh_token);

      await refreshWith(first).expect(401);
      await refreshWith(newest).expect(200);
    });

    it('rejects unknown, malformed and missing refresh tokens and clears cookies', async () => {
      const unknown = await refreshWith(
        randomBytes(32).toString('base64url'),
      ).expect(401);
      expect(cookiesOf(unknown).refresh_token).toMatch(/refresh_token=;/);
      await refreshWith('x').expect(401);
      await http()
        .post('/auth/refresh')
        .set('X-Forwarded-For', freshIp())
        .expect(401);
    });

    it('rejects an expired refresh token', async () => {
      const { jar } = await registerAndLogin();
      const token = valueOf(jar.refresh_token);
      await ds.query(
        `UPDATE sesion_refresco SET expira_en = now() - interval '1 second'
          WHERE token_hash = encode(sha256($1::bytea), 'hex')`,
        [Buffer.from(token)],
      );
      await refreshWith(token).expect(401);
    });

    it('enforces the absolute session lifetime', async () => {
      const { jar } = await registerAndLogin();
      const token = valueOf(jar.refresh_token);
      await ds.query(
        `UPDATE sesion_refresco SET creada_en = now() - interval '31 days'
          WHERE familia_id = (SELECT familia_id FROM sesion_refresco
                               WHERE token_hash = encode(sha256($1::bytea), 'hex'))`,
        [Buffer.from(token)],
      );
      await refreshWith(token).expect(401);
    });

    it('does not refresh for an inactive user', async () => {
      const { body, jar } = await registerAndLogin();
      await ds.query(`UPDATE usuario SET activo = false WHERE correo = $1`, [
        body.correo,
      ]);
      await refreshWith(valueOf(jar.refresh_token)).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the family and clears both cookies', async () => {
      const { jar } = await registerAndLogin();
      const res = await http()
        .post('/auth/logout')
        .set('X-Forwarded-For', freshIp())
        .set('Cookie', cookieHeader(jar))
        .expect(204);
      const cleared = cookiesOf(res);
      expect(cleared.auth_token).toMatch(
        /auth_token=;.*Expires=Thu, 01 Jan 1970/,
      );
      expect(cleared.refresh_token).toMatch(
        /refresh_token=;.*Path=\/auth.*Expires=Thu, 01 Jan 1970/,
      );
      expect(res.headers['cache-control']).toBe('no-store');
      await refreshWith(valueOf(jar.refresh_token)).expect(401);
    });

    it('is idempotent without cookies', async () => {
      const res = await http()
        .post('/auth/logout')
        .set('X-Forwarded-For', freshIp())
        .expect(204);
      expect(Object.keys(cookiesOf(res)).sort()).toEqual([
        'auth_token',
        'refresh_token',
      ]);
    });
  });

  describe('RolesGuard', () => {
    it('allows the matching role and forbids others', async () => {
      const { jar } = await registerAndLogin();
      const cookie = cookieHeader(jar, ['auth_token']);
      await http()
        .get('/_t/doctor-or-admin')
        .set('X-Forwarded-For', freshIp())
        .set('Cookie', cookie)
        .expect(200);
      await http()
        .get('/_t/admin-only')
        .set('X-Forwarded-For', freshIp())
        .set('Cookie', cookie)
        .expect(403);
    });

    it('allows an administrator', async () => {
      const { body } = await registerAndLogin();
      await ds.query(
        `UPDATE usuario SET rol_id = (SELECT id FROM rol WHERE nombre = 'administrador') WHERE correo = $1`,
        [body.correo],
      );
      // Role claims come from the token: log in again to get an admin token.
      const res = await login(body.correo).expect(200);
      await http()
        .get('/_t/admin-only')
        .set('X-Forwarded-For', freshIp())
        .set('Cookie', cookieHeader(cookiesOf(res), ['auth_token']))
        .expect(200);
    });
  });

  it('sends Cache-Control: no-store on every auth route', async () => {
    for (const [method, path] of [
      ['post', '/auth/login'],
      ['post', '/auth/register'],
      ['post', '/auth/refresh'],
      ['post', '/auth/logout'],
      ['get', '/auth/me'],
    ] as const) {
      const res = await http()
        [method](path)
        .set('X-Forwarded-For', freshIp())
        .send({});
      expect(res.headers['cache-control'], path).toBe('no-store');
    }
  });
});
