/**
 * Integration test of the service catalog against live PostgreSQL and Redis
 * (`bun run infra:up`, migrations applied, apps/api/.env in place). Image
 * storage is replaced by an in-memory fake: nothing reaches Cloudinary.
 * Created rows are removed afterwards.
 */
import { randomBytes, randomInt } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { APP_CREATE_OPTIONS, configureApp } from './../src/app.setup.js';
import {
  IMAGE_STORAGE,
  ImageStorageNotConfiguredError,
  type ImageStorage,
} from './../src/catalogo/image-storage.js';

vi.hoisted(() => {
  process.env.TRUST_PROXY = '1';
});

const PASSWORD = 'correct horse battery';
const TAG = `e2e${randomBytes(3).toString('hex')}`;
const freshIp = () =>
  `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
const email = () => `cat-e2e-${randomBytes(6).toString('hex')}@test.local`;
const cedula = () => String(randomInt(10_000_000, 999_999_999));
const nombre = (label: string) => `Servicio ${TAG} ${label}`;

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(256, 1),
]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(256, 2),
]);

class FakeImageStorage implements ImageStorage {
  configured = true;
  uploads: { publicId: string; hint: string }[] = [];
  deleted: string[] = [];
  private n = 0;

  upload(_buffer: Buffer, opts: { publicIdHint: string }) {
    if (!this.configured) {
      return Promise.reject(new ImageStorageNotConfiguredError());
    }
    const publicId = `orthopro/catalogo/${opts.publicIdHint}-${++this.n}`;
    this.uploads.push({ publicId, hint: opts.publicIdHint });
    return Promise.resolve({
      url: `https://res.cloudinary.com/fake/image/upload/v1/${publicId}.jpg`,
      publicId,
    });
  }

  delete(publicId: string) {
    this.deleted.push(publicId);
    return Promise.resolve();
  }
}

describe('Catalogo (e2e)', () => {
  let app: NestExpressApplication;
  let ds: DataSource;
  const storage = new FakeImageStorage();
  let adminCookie = '';
  let doctorCookie = '';
  const http = () => request(app.getHttpServer());

  const cookieOf = (res: request.Response) => {
    const raw = res.headers['set-cookie'] as unknown as string[];
    return raw
      .map((l) => l.split(';')[0])
      .filter((c) => c.startsWith('auth_token='))
      .join('; ');
  };

  async function signUp(rol: 'administrador' | 'odontologo') {
    const ip = freshIp();
    const body = {
      nombres: 'Ana',
      apellidos: 'Prueba',
      cedula: cedula(),
      correo: email(),
      password: PASSWORD,
    };
    await http()
      .post('/auth/register')
      .set('X-Forwarded-For', ip)
      .send(body)
      .expect(201);
    if (rol === 'administrador') {
      await ds.query(
        `UPDATE usuario SET rol_id = (SELECT id FROM rol WHERE nombre = 'administrador') WHERE correo = $1`,
        [body.correo],
      );
    }
    const res = await http()
      .post('/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ correo: body.correo, password: PASSWORD })
      .expect(200);
    return cookieOf(res);
  }

  const admin = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    http()
      [method](path)
      .set('X-Forwarded-For', freshIp())
      .set('Cookie', adminCookie);

  const pub = (path: string) =>
    http().get(path).set('X-Forwarded-For', freshIp());

  type Servicio = Record<string, unknown> & { id: string; slug: string };
  async function create(label: string, extra: Record<string, unknown> = {}) {
    const res = await admin('post', '/admin/catalogo/servicios')
      .send({
        nombre: nombre(label),
        descripcion: 'Desc',
        precio: '1500.5',
        ...extra,
      })
      .expect(201);
    return res.body as Servicio;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IMAGE_STORAGE)
      .useValue(storage)
      .compile();
    app =
      moduleRef.createNestApplication<NestExpressApplication>(
        APP_CREATE_OPTIONS,
      );
    configureApp(app);
    await app.init();
    ds = app.get(DataSource);
    adminCookie = await signUp('administrador');
    doctorCookie = await signUp('odontologo');
  });

  beforeEach(() => {
    storage.configured = true;
  });

  afterAll(async () => {
    await ds.query(
      `DELETE FROM detalle_orden WHERE servicio_id IN (SELECT id FROM servicio WHERE nombre LIKE $1)`,
      [`Servicio ${TAG}%`],
    );
    await ds.query(
      `DELETE FROM orden WHERE doctor_id IN (SELECT id FROM usuario WHERE correo LIKE 'cat-e2e-%')`,
    );
    await ds.query(
      `DELETE FROM paciente_doctor WHERE doctor_id IN (SELECT id FROM usuario WHERE correo LIKE 'cat-e2e-%')`,
    );
    await ds.query(`DELETE FROM paciente WHERE nombre = 'cat-e2e'`);
    await ds.query(`DELETE FROM servicio WHERE nombre LIKE $1`, [
      `Servicio ${TAG}%`,
    ]);
    await ds.query(
      `DELETE FROM sesion_refresco WHERE usuario_id IN (SELECT id FROM usuario WHERE correo LIKE 'cat-e2e-%')`,
    );
    await ds.query(
      `DELETE FROM doctor WHERE usuario_id IN (SELECT id FROM usuario WHERE correo LIKE 'cat-e2e-%')`,
    );
    await ds.query(`DELETE FROM usuario WHERE correo LIKE 'cat-e2e-%'`);
    await app.close();
  });

  describe('seed', () => {
    it('contains the four provisional service lines at price 0.00', async () => {
      const rows = (await ds.query(
        `SELECT slug, precio, activo FROM servicio WHERE slug IN
         ('ortodoncia-fija','ortodoncia-removible','alineadores-invisibles','retenedores-y-ferulas')`,
      )) as { slug: string; precio: string; activo: boolean }[];
      expect(rows).toHaveLength(4);
      for (const r of rows) {
        expect(r.precio).toBe('0.00');
        expect(r.activo).toBe(true);
      }
    });
  });

  describe('public endpoints', () => {
    it('lists only active services with the public fields and a short public cache', async () => {
      const active = await create('publico');
      const hidden = await create('oculto', { activo: false });
      const res = await pub('/catalogo/servicios').expect(200);
      expect(res.headers['cache-control']).toBe(
        'public, max-age=60, stale-while-revalidate=300',
      );
      const list = res.body as Record<string, unknown>[];
      const slugs = list.map((s) => s.slug);
      expect(slugs).toContain(active.slug);
      expect(slugs).not.toContain(hidden.slug);
      expect(slugs).toContain('ortodoncia-fija');
      const names = list.map((s) => s.nombre as string);
      const mine = names.filter((n) => n.startsWith(`Servicio ${TAG}`));
      expect(mine).toEqual([...mine].sort());
      for (const item of list) {
        expect(Object.keys(item).sort()).toEqual(
          ['descripcion', 'id', 'imagenUrl', 'nombre', 'slug'].sort(),
        );
      }
      expect(JSON.stringify(res.body)).not.toMatch(
        /precio|activo|imagenPublicId|fecha/i,
      );
    });

    it('returns one service by slug without price or internals', async () => {
      const svc = await create('detalle');
      const res = await pub(`/catalogo/servicios/${svc.slug}`).expect(200);
      expect(res.headers['cache-control']).toBe(
        'public, max-age=60, stale-while-revalidate=300',
      );
      expect(res.body).toEqual({
        id: svc.id,
        slug: svc.slug,
        nombre: nombre('detalle'),
        descripcion: 'Desc',
        imagenUrl: null,
      });
      expect(JSON.stringify(res.body)).not.toMatch(/precio|activo|publicId/i);
    });

    it('answers 404 for unknown and inactive slugs', async () => {
      const inactive = await create('inactivo', { activo: false });
      await pub('/catalogo/servicios/no-existe-xyz').expect(404);
      await pub(`/catalogo/servicios/${inactive.slug}`).expect(404);
    });

    it('needs no authentication', async () => {
      await pub('/catalogo/servicios').expect(200);
    });
  });

  describe('admin access control', () => {
    const routes: [string, string][] = [
      ['get', '/admin/catalogo/servicios'],
      ['post', '/admin/catalogo/servicios'],
      ['get', '/admin/catalogo/servicios/1'],
      ['patch', '/admin/catalogo/servicios/1'],
      ['delete', '/admin/catalogo/servicios/1'],
      ['post', '/admin/catalogo/servicios/1/imagen'],
    ];

    it.each(routes)('401 without cookies: %s %s', async (method, path) => {
      await (http() as unknown as Record<string, (p: string) => request.Test>)
        [method](path)
        .set('X-Forwarded-For', freshIp())
        .expect(401);
    });

    it.each(routes)('403 for an odontologo: %s %s', async (method, path) => {
      await (http() as unknown as Record<string, (p: string) => request.Test>)
        [method](path)
        .set('X-Forwarded-For', freshIp())
        .set('Cookie', doctorCookie)
        .expect(403);
    });
  });

  describe('admin CRUD', () => {
    it('creates with a generated slug and normalized price, and lists everything', async () => {
      const svc = await create('crud');
      expect(svc.slug).toBe(`servicio-${TAG}-crud`);
      expect(svc).toMatchObject({
        nombre: nombre('crud'),
        precio: '1500.50',
        activo: true,
        imagenUrl: null,
      });
      expect(svc).toHaveProperty('fechaCreacion');
      expect(svc).toHaveProperty('fechaActualizacion');
      expect(svc).not.toHaveProperty('imagenPublicId');
      const list = await admin('get', '/admin/catalogo/servicios').expect(200);
      const found = (list.body as Servicio[]).find((s) => s.id === svc.id);
      expect(found?.precio).toBe('1500.50');
      const one = await admin(
        'get',
        `/admin/catalogo/servicios/${svc.id}`,
      ).expect(200);
      expect(one.body).toMatchObject({ id: svc.id, precio: '1500.50' });
    });

    it('keeps the slug stable when the name changes and updates other fields', async () => {
      const svc = await create('patch');
      const res = await admin('patch', `/admin/catalogo/servicios/${svc.id}`)
        .send({
          nombre: nombre('patch renombrado'),
          precio: '99',
          activo: false,
          descripcion: null,
        })
        .expect(200);
      expect(res.body).toMatchObject({
        slug: svc.slug,
        nombre: nombre('patch renombrado'),
        precio: '99.00',
        activo: false,
        descripcion: null,
      });
    });

    it('suffixes the slug when two names slugify equally', async () => {
      const a = await create('colision A');
      const b = await admin('post', '/admin/catalogo/servicios')
        .send({ nombre: nombre('colision a'), precio: '1' })
        .expect(201);
      expect(a.slug).toBe(`servicio-${TAG}-colision-a`);
      expect((b.body as Servicio).slug).toBe(`servicio-${TAG}-colision-a-2`);
    });

    it('answers 409 with a Spanish message on a duplicate name (create and patch)', async () => {
      const a = await create('dup1');
      const b = await create('dup2');
      const dup = await admin('post', '/admin/catalogo/servicios')
        .send({ nombre: nombre('dup1'), precio: '1' })
        .expect(409);
      expect(JSON.stringify(dup.body)).toMatch(/Ya existe un servicio/);
      await admin('patch', `/admin/catalogo/servicios/${b.id}`)
        .send({ nombre: a.nombre })
        .expect(409);
    });

    it.each([
      ['precio with 3 decimals', { precio: '1.234' }],
      ['negative precio', { precio: '-1' }],
      ['short nombre', { nombre: 'a' }],
      ['unknown field', { slug: 'hack' }],
      ['numeric precio', { precio: 5 }],
    ])('answers 400 for %s', async (_l, over) => {
      await admin('post', '/admin/catalogo/servicios')
        .send({ nombre: nombre('invalido'), precio: '1', ...over })
        .expect(400);
    });

    it('answers 400 for a non numeric id and 404 for an unknown one', async () => {
      await admin('get', '/admin/catalogo/servicios/abc').expect(400);
      await admin('get', '/admin/catalogo/servicios/1e3').expect(400);
      await admin('get', '/admin/catalogo/servicios/999999999999').expect(404);
      await admin('patch', '/admin/catalogo/servicios/999999999999')
        .send({ precio: '1' })
        .expect(404);
    });

    it('rejects an Origin outside the allow-list on unsafe methods', async () => {
      await http()
        .post('/admin/catalogo/servicios')
        .set('X-Forwarded-For', freshIp())
        .set('Cookie', adminCookie)
        .set('Origin', 'https://evil.test')
        .send({ nombre: nombre('csrf'), precio: '1' })
        .expect(403);
    });
  });

  describe('image upload', () => {
    const upload = (
      id: string,
      buf: Buffer,
      name = 'foto.jpg',
      type = 'image/jpeg',
    ) =>
      admin('post', `/admin/catalogo/servicios/${id}/imagen`).attach(
        'imagen',
        buf,
        {
          filename: name,
          contentType: type,
        },
      );

    beforeEach(() => {
      storage.configured = true;
    });

    it('stores the Cloudinary URL and replaces (deletes) the previous asset', async () => {
      const svc = await create('imagen');
      const first = await upload(svc.id, JPEG).expect(200);
      expect(first.body.imagenUrl).toMatch(
        /^https:\/\/res\.cloudinary\.com\/fake\//,
      );
      expect(first.body).not.toHaveProperty('imagenPublicId');
      const [row] = (await ds.query(
        `SELECT imagen_url, imagen_public_id FROM servicio WHERE id = $1`,
        [svc.id],
      )) as { imagen_url: string; imagen_public_id: string }[];
      expect(row.imagen_public_id).toContain(svc.slug);
      const firstId = row.imagen_public_id;

      const second = await upload(svc.id, PNG, 'otra.png', 'image/png').expect(
        200,
      );
      expect(second.body.imagenUrl).not.toBe(first.body.imagenUrl);
      expect(storage.deleted).toContain(firstId);
    });

    it('exposes imagenUrl publicly once uploaded', async () => {
      const svc = await create('imagen publica');
      await upload(svc.id, JPEG).expect(200);
      const res = await pub(`/catalogo/servicios/${svc.slug}`).expect(200);
      expect(res.body.imagenUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    });

    it('rejects a file whose bytes are not JPEG/PNG/WebP even with an image mimetype', async () => {
      const svc = await create('imagen mala');
      const before = storage.uploads.length;
      await upload(
        svc.id,
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        'x.jpg',
        'image/jpeg',
      ).expect(400);
      await upload(
        svc.id,
        Buffer.from('GIF89a'.padEnd(100, 'x')),
        'x.png',
        'image/png',
      ).expect(400);
      expect(storage.uploads.length).toBe(before);
    });

    it('rejects an empty file, a missing file and a wrong field name', async () => {
      const svc = await create('imagen vacia');
      await upload(svc.id, Buffer.alloc(0)).expect(400);
      await admin('post', `/admin/catalogo/servicios/${svc.id}/imagen`).expect(
        400,
      );
      await admin('post', `/admin/catalogo/servicios/${svc.id}/imagen`)
        .attach('otro', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(400);
    });

    it('rejects files over 5 MB with 400', async () => {
      const svc = await create('imagen grande');
      const big = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]);
      await upload(svc.id, big).expect(400);
    });

    it('answers 404 for an unknown service and 400 for a bad id', async () => {
      await upload('999999999999', JPEG).expect(404);
      await upload('abc', JPEG).expect(400);
    });

    it('answers 503 when storage is not configured', async () => {
      const svc = await create('sin storage');
      storage.configured = false;
      const res = await upload(svc.id, JPEG).expect(503);
      expect(JSON.stringify(res.body)).toMatch(/imagenes|almacenamiento/i);
    });
  });

  describe('delete rule', () => {
    it('hard deletes (204) an unreferenced service and removes its image', async () => {
      const svc = await create('borrar');
      await admin('post', `/admin/catalogo/servicios/${svc.id}/imagen`)
        .attach('imagen', JPEG, {
          filename: 'a.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);
      const [row] = (await ds.query(
        `SELECT imagen_public_id AS pid FROM servicio WHERE id = $1`,
        [svc.id],
      )) as { pid: string }[];
      await admin('delete', `/admin/catalogo/servicios/${svc.id}`).expect(204);
      const left = (await ds.query(`SELECT 1 FROM servicio WHERE id = $1`, [
        svc.id,
      ])) as unknown[];
      expect(left).toHaveLength(0);
      expect(storage.deleted).toContain(row.pid);
      await admin('delete', `/admin/catalogo/servicios/${svc.id}`).expect(404);
    });

    it('deactivates (200) a service referenced by detalle_orden', async () => {
      const svc = await create('referenciado');
      const [doc] = (await ds.query(
        `SELECT u.id FROM usuario u JOIN rol r ON r.id = u.rol_id
         WHERE u.correo LIKE 'cat-e2e-%' AND r.nombre = 'odontologo' LIMIT 1`,
      )) as { id: string }[];
      const [pac] = (await ds.query(
        `INSERT INTO paciente (nombre) VALUES ('cat-e2e') RETURNING id`,
      )) as { id: string }[];
      await ds.query(
        `INSERT INTO paciente_doctor (paciente_id, doctor_id) VALUES ($1, $2)`,
        [pac.id, doc.id],
      );
      const [ord] = (await ds.query(
        `INSERT INTO orden (doctor_id, paciente_id, estado_id)
         VALUES ($1, $2, (SELECT id FROM estado_orden ORDER BY posicion LIMIT 1)) RETURNING id`,
        [doc.id, pac.id],
      )) as { id: string }[];
      await ds.query(
        `INSERT INTO detalle_orden (orden_id, servicio_id, precio_unitario) VALUES ($1, $2, 10)`,
        [ord.id, svc.id],
      );
      const res = await admin(
        'delete',
        `/admin/catalogo/servicios/${svc.id}`,
      ).expect(200);
      expect(res.body).toMatchObject({ id: svc.id, activo: false });
      const kept = (await ds.query(
        `SELECT activo FROM servicio WHERE id = $1`,
        [svc.id],
      )) as { activo: boolean }[];
      expect(kept).toEqual([{ activo: false }]);
      await pub(`/catalogo/servicios/${svc.slug}`).expect(404);
    });
  });

  describe('database constraints', () => {
    it('rejects an image URL outside Cloudinary and a duplicate slug', async () => {
      const svc = await create('constraint');
      await expect(
        ds.query(
          `UPDATE servicio SET imagen_url = 'https://evil.test/a.jpg' WHERE id = $1`,
          [svc.id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
      await expect(
        ds.query(`UPDATE servicio SET slug = 'ortodoncia-fija' WHERE id = $1`, [
          svc.id,
        ]),
      ).rejects.toMatchObject({ driverError: { code: '23505' } });
    });
  });
});
