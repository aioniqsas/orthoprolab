import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation.js';
import type { Repository } from 'typeorm';
import { configureCrypto, resetCrypto } from '../crypto/crypto.registry.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { hashTelefono, normalizeTelefono } from './normalize-telefono.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';
import {
  WhatsappVinculacionService,
  CODIGO_TTL_SEGUNDOS,
  MAX_INTENTOS,
} from './whatsapp-vinculacion.service.js';

beforeEach(() =>
  configureCrypto(
    new CryptoService({
      encryptionKey: randomBytes(32).toString('base64'),
      blindIndexKey: randomBytes(32).toString('base64'),
    }),
  ),
);
afterEach(() => resetCrypto());

const TELEFONO = '+573001234567';
const CLINICA_A = '11';
const CLINICA_B = '22';

/** Redis de mentira: solo lo que usa el servicio y verificarFirma. */
function redisFalso() {
  const datos = new Map<string, string>();
  const ttl = new Map<string, number>();
  return {
    datos,
    async get(k: string) {
      return datos.get(k);
    },
    async set(k: string, v: string, _modo: string, seg?: number, _nx?: string) {
      if (_nx === 'NX' && datos.has(k)) return null;
      datos.set(k, v);
      if (seg) ttl.set(k, seg);
      return 'OK';
    },
    async del(k: string) {
      datos.delete(k);
      ttl.delete(k);
      return 1;
    },
    async incr(k: string) {
      const n = Number(datos.get(k) ?? '0') + 1;
      datos.set(k, String(n));
      if (!ttl.has(k)) ttl.set(k, CODIGO_TTL_SEGUNDOS);
      return n;
    },
    async expire(k: string, seg: number) {
      if (datos.has(k)) ttl.set(k, seg);
      return 1;
    },
    async getdel(k: string) {
      const v = datos.get(k);
      datos.delete(k);
      ttl.delete(k);
      return v ?? null;
    },
    async pttl(k: string) {
      if (!datos.has(k)) return -2;
      const seg = ttl.get(k);
      return seg === undefined ? -1 : seg * 1000;
    },
  };
}
type RedisFalso = ReturnType<typeof redisFalso>;

interface Fila {
  id: string;
  telefonoHash: string;
  clinicaId: string;
  doctorId: string | null;
  estado: string;
  verificadoEn: Date | null;
  guardado: boolean;
}

/** Repositorio de contactos en memoria: findOneBy por hash y save(). */
function repoContactos(filas: Fila[] = []): Repository<WhatsappContacto> {
  return {
    findOneBy: async (where: Record<string, unknown>) =>
      filas.find((f) => f.telefonoHash === where.telefonoHash) ?? null,
    save: async (entidad: Partial<WhatsappContacto>) => {
      const existente = filas.find((f) => f.telefonoHash === entidad.telefonoHash);
      if (existente) {
        existente.clinicaId = entidad.clinicaId ?? existente.clinicaId;
        existente.doctorId = entidad.doctorId ?? null;
        existente.estado = entidad.estado ?? existente.estado;
        existente.verificadoEn = entidad.verificadoEn ?? new Date();
        existente.guardado = true;
        return existente as never;
      }
      const nueva: Fila = {
        id: `nuevo-${filas.length + 1}`,
        telefonoHash: entidad.telefonoHash ?? '',
        clinicaId: entidad.clinicaId ?? '',
        doctorId: null,
        estado: entidad.estado ?? 'pendiente',
        verificadoEn: entidad.verificadoEn ?? null,
        guardado: true,
      };
      filas.push(nueva);
      return nueva as never;
    },
    create: (datos: Record<string, unknown>) => datos as never,
  } as unknown as Repository<WhatsappContacto>;
}

function auditoriaRepo() {
  const filas: Array<Record<string, unknown>> = [];
  return {
    filas,
    repo: {
      save: async (fila: Record<string, unknown>) => {
        filas.push(fila);
        return fila;
      },
    } as unknown as Repository<never>,
  };
}

function config(serviceToken = 'st', hmac = 'hs') {
  const valores: Record<string, string> = {
    WHATSAPP_SERVICE_TOKEN: serviceToken,
    WHATSAPP_HMAC_SECRET: hmac,
  };
  return { get: (k: string) => valores[k] } as unknown as ConfigService<EnvConfig, true>;
}

function cabeceras(
  telefono: string,
  codigo: string,
  token = 'st',
  secret = 'hs',
  nonce = randomUUID().replaceAll('-', ''),
) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secret)
    .update(`${telefono}|${timestamp}|${nonce}`)
    .digest('hex');
  return { token, timestamp, nonce, signature, codigo };
}

function montar(redis?: RedisFalso) {
  const filas: Fila[] = [];
  const auditoria = auditoriaRepo();
  const r = redis ?? redisFalso();
  const servicio = new WhatsappVinculacionService(
    config(),
    repoContactos(filas) as never,
    auditoria.repo as never,
    r as never,
    {
      registrarContacto: async (input: { telefono: string; clinicaId: string; estado: string }) => {
        const canonical = normalizeTelefono(input.telefono);
        if (filas.some((f) => f.telefonoHash === hashTelefono(canonical))) {
          throw new Error('contacto_duplicado');
        }
        const nueva: Fila = {
          id: `reg-${filas.length + 1}`,
          telefonoHash: hashTelefono(canonical),
          clinicaId: input.clinicaId,
          doctorId: null,
          estado: input.estado,
          verificadoEn: new Date(),
          guardado: true,
        };
        filas.push(nueva);
        return { id: nueva.id } as never;
      },
    } as never,
  );
  return { servicio, filas, auditoria: auditoria.filas, redis: r };
}

/** Emite un código para la clínica y lo devuelve. */
async function codigoPara(servicio: WhatsappVinculacionService, clinicaId: string): Promise<string> {
  const respuesta = await servicio.emitirCodigo(clinicaId);
  expect(respuesta.codigo).toMatch(/^\d{6}$/);
  expect(respuesta.expiraEnSegundos).toBe(CODIGO_TTL_SEGUNDOS);
  return respuesta.codigo;
}

describe('WhatsappVinculacionService — emisión', () => {
  it('emite un código de 6 dígitos con TTL de 10 minutos para la clínica de la sesión', async () => {
    const { servicio, redis } = montar();
    await codigoPara(servicio, CLINICA_A);
    const claves = [...redis.datos.keys()].filter((k) => k.includes('otp'));
    expect(claves.length).toBe(2); // código por hash + marcador por clínica
    expect(claves.some((k) => k.includes(`clinica:${CLINICA_A}`))).toBe(true);
  });

  it('el código se guarda como hash, nunca en claro', async () => {
    const { servicio, redis } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    expect([...redis.datos.values()]).not.toContain(codigo);
  });

  it('emitir un segundo código invalida el primero', async () => {
    const { servicio, redis } = montar();
    const primero = await codigoPara(servicio, CLINICA_A);
    const segundo = await codigoPara(servicio, CLINICA_A);
    expect(segundo).not.toBe(primero);
    const hashPrimero = (await import('node:crypto')).createHash('sha256').update(primero).digest('hex');
    expect(await redis.get(`whatsapp:otp:codigo:${hashPrimero}`)).toBeUndefined();
    const { servicio: s2, filas } = montar();
    const c1 = await codigoPara(s2, CLINICA_A);
    await codigoPara(s2, CLINICA_A);
    // El código viejo ya no redime: el mapa quedó sin su clave.
    const hash = (await import('node:crypto')).createHash('sha256').update(c1).digest('hex');
    void filas;
    expect(await redis.get(`whatsapp:otp:codigo:${hash}`)).toBeUndefined();
  });

  it('sin Redis falla cerrado (503), igual que los demás endpoints internos', async () => {
    const { servicio } = montar(undefined);
    (servicio as unknown as { redis: unknown }).redis = undefined;
    await expect(servicio.emitirCodigo(CLINICA_A)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('cada emisión queda auditada con intención y resultado, sin el código', async () => {
    const { servicio, auditoria } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    expect(auditoria.length).toBe(1);
    const fila = JSON.stringify(auditoria[0]);
    expect(fila).toContain('codigo_emitido');
    expect(fila).not.toContain(codigo);
  });
});

describe('WhatsappVinculacionService — canje', () => {
  it('canje válido deja el contacto verificado con la clínica del código', async () => {
    const { servicio, filas } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    const res = await servicio.vincular(TELEFONO, cabeceras(TELEFONO, codigo).token, cabeceras(TELEFONO, codigo), codigo);
    expect(res.ok).toBe(true);
    expect(filas[0].estado).toBe('verificado');
    expect(filas[0].clinicaId).toBe(CLINICA_A);
  });

  it('el código es de un solo uso: el segundo canje falla', async () => {
    const { servicio } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    const h = cabeceras(TELEFONO, codigo);
    await servicio.vincular(TELEFONO, h.token, h, codigo);
    const h2 = cabeceras(TELEFONO, codigo);
    const res = await servicio.vincular(TELEFONO, h2.token, h2, codigo);
    expect(res.ok).toBe(false);
  });

  it('código inexistente o vencido falla con resultado genérico', async () => {
    const { servicio, auditoria } = montar();
    const h = cabeceras(TELEFONO, '999999');
    const res = await servicio.vincular(TELEFONO, h.token, h, '999999');
    expect(res.ok).toBe(false);
    expect(res).toMatchObject({ ok: false, motivo: 'codigo_invalido' });
    expect(JSON.stringify(auditoria)).not.toContain('999999');
  });

  it('demasiados intentos fallidos contra el mismo teléfono matan el canje aunque el código sea válido', async () => {
    const { servicio } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const h = cabeceras(TELEFONO, '000000');
      await servicio.vincular(TELEFONO, h.token, h, '000000');
    }
    const h = cabeceras(TELEFONO, codigo);
    const res = await servicio.vincular(TELEFONO, h.token, h, codigo);
    expect(res).toMatchObject({ ok: false, motivo: 'limitada' });
  });

  it('un teléfono verificado en otra clínica no se roba: falla y queda auditado', async () => {
    const { servicio, filas, auditoria } = montar();
    filas.push({
      id: 'c1',
      telefonoHash: hashTelefono(normalizeTelefono(TELEFONO)),
      clinicaId: CLINICA_B,
      doctorId: null,
      estado: 'verificado',
      verificadoEn: new Date(),
      guardado: false,
    });
    const codigo = await codigoPara(servicio, CLINICA_A);
    const h = cabeceras(TELEFONO, codigo);
    const res = await servicio.vincular(TELEFONO, h.token, h, codigo);
    expect(res.ok).toBe(false);
    expect(filas[0].clinicaId).toBe(CLINICA_B);
    expect(filas[0].guardado).toBe(false);
    expect(JSON.stringify(auditoria)).toContain('rechazada_ya_verificado');
  });

  it('un contacto pendiente puede revincularse a la clínica del código', async () => {
    const { servicio, filas } = montar();
    filas.push({
      id: 'c1',
      telefonoHash: hashTelefono(normalizeTelefono(TELEFONO)),
      clinicaId: CLINICA_B,
      doctorId: '7',
      estado: 'pendiente',
      verificadoEn: null,
      guardado: false,
    });
    const codigo = await codigoPara(servicio, CLINICA_A);
    const h = cabeceras(TELEFONO, codigo);
    const res = await servicio.vincular(TELEFONO, h.token, h, codigo);
    expect(res.ok).toBe(true);
    expect(filas[0].clinicaId).toBe(CLINICA_A);
    expect(filas[0].estado).toBe('verificado');
    expect(filas[0].doctorId).toBeNull();
    expect(filas[0].guardado).toBe(true);
  });

  it('un número nuevo se registra verificado con la clínica del código', async () => {
    const { servicio, filas } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    const h = cabeceras(TELEFONO, codigo);
    const res = await servicio.vincular(TELEFONO, h.token, h, codigo);
    expect(res.ok).toBe(true);
    expect(filas[0].estado).toBe('verificado');
    expect(filas[0].clinicaId).toBe(CLINICA_A);
  });

  it('firma inválida rechaza sin tocar nada', async () => {
    const { servicio, filas } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    const h = cabeceras(TELEFONO, codigo, 'otro-token');
    await expect(servicio.vincular(TELEFONO, h.token, h, codigo)).rejects.toBeInstanceOf(HttpException);
    expect(filas.length).toBe(0);
  });

  it('cada intento queda auditado sin teléfono, código ni cuerpo', async () => {
    const { servicio, auditoria } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    const h = cabeceras(TELEFONO, '000000');
    await servicio.vincular(TELEFONO, h.token, h, '000000');
    const fila = JSON.stringify(auditoria.at(-1));
    expect(fila).not.toContain(TELEFONO);
    expect(fila).not.toContain('000000');
    expect(auditoria.at(-1)).toMatchObject({ intencion: 'vinculacion' });
  });

  it('un teléfono malformado consume intento: al sexto se limita aunque cambie el código', async () => {
    const { servicio, auditoria, redis } = montar();
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const h = cabeceras('no-soy-un-telefono', '000000');
      const res = await servicio.vincular('no-soy-un-telefono', h.token, h, '000000');
      expect(res).toMatchObject({ ok: false, motivo: 'codigo_invalido' });
    }
    const h = cabeceras('no-soy-un-telefono', '123456');
    const res = await servicio.vincular('no-soy-un-telefono', h.token, h, '123456');
    expect(res).toMatchObject({ ok: false, motivo: 'limitada' });
    // Guardia del borrador cosmético: nunca queda una clave con sufijo vacío.
    expect([...redis.datos.keys()].some((k) => k === 'whatsapp:otp:clinica:')).toBe(false);
    expect(JSON.stringify(auditoria)).not.toContain('no-soy-un-telefono');
  });

  it('un fallo técnico de escritura no quema el código: se restaura con su TTL', async () => {
    const { servicio, redis, auditoria } = montar();
    const codigo = await codigoPara(servicio, CLINICA_A);
    const hashCodigo = (await import('node:crypto')).createHash('sha256').update(codigo).digest('hex');
    const claveCodigo = `whatsapp:otp:codigo:${hashCodigo}`;
    // Escritura que falla: el save() del contacto lanza.
    const repoRoto = {
      findOneBy: async () => ({
        id: 'c1',
        telefonoHash: hashTelefono(normalizeTelefono(TELEFONO)),
        clinicaId: CLINICA_B,
        doctorId: null,
        estado: 'pendiente',
        verificadoEn: null,
      }),
      save: async () => {
        throw new Error('boom');
      },
    } as unknown as Repository<WhatsappContacto>;
    (servicio as unknown as { contactos: Repository<WhatsappContacto> }).contactos = repoRoto;
    const h = cabeceras(TELEFONO, codigo);
    const res = await servicio.vincular(TELEFONO, h.token, h, codigo);
    expect(res).toMatchObject({ ok: false, motivo: 'rechazado' });
    // El código sigue canjeable y conserva TTL; la auditoría distingue el fallo.
    expect(await redis.get(claveCodigo)).toBe(CLINICA_A);
    expect(await redis.pttl(claveCodigo)).toBeGreaterThan(0);
    expect(auditoria.at(-1)).toMatchObject({ resultado: 'fallo_tecnico' });
    // Con la escritura reparada, el mismo código vincula.
    (servicio as unknown as { contactos: Repository<WhatsappContacto> }).contactos = repoContactos();
    const h2 = cabeceras(TELEFONO, codigo);
    const res2 = await servicio.vincular(TELEFONO, h2.token, h2, codigo);
    expect(res2.ok).toBe(true);
  });

  it('dos canjes concurrentes del mismo código producen exactamente un éxito', async () => {
    const { servicio: base, redis } = montar();
    const codigo = await codigoPara(base, CLINICA_A);
    const a = montar(redis);
    const b = montar(redis);
    const h1 = cabeceras(TELEFONO, codigo);
    const h2 = cabeceras(TELEFONO, codigo);
    const [r1, r2] = await Promise.all([
      a.servicio.vincular(TELEFONO, h1.token, h1, codigo),
      b.servicio.vincular(TELEFONO, h2.token, h2, codigo),
    ]);
    const exitos = [r1, r2].filter((r) => r.ok);
    expect(exitos.length).toBe(1);
    expect([r1, r2].some((r) => r.ok === false)).toBe(true);
  });
});
