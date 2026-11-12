import { createHmac, randomUUID } from 'node:crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { EnvConfig } from '../config/env.validation.js';
import { JwtStrategy, parseJwtPayload } from '../auth/jwt.strategy.js';
import { IS_PUBLIC_KEY } from '../auth/public.decorator.js';
import type { WhatsappIdentidadService } from './whatsapp-identidad.service.js';
import { WhatsappSesionController } from './whatsapp-sesion.controller.js';
import { WhatsappSesionService } from './whatsapp-sesion.service.js';

const JWT_SECRET = Buffer.alloc(48, 7).toString('base64');
const SERVICE_TOKEN = 'shared-service-token-for-the-bot';
const HMAC_SECRET = 'test-hmac-secret';
const TELEFONO = '+573001234567';
const CLINICA_ID = '42';
const DOCTOR_ID = '9';
const USUARIO_ID = '22222222-2222-4222-8222-222222222222';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lanza la excepción HTTP que el endpoint respondería, o falla el test. */
async function rechazo(ejecutar: () => Promise<unknown>): Promise<HttpException> {
  try {
    await ejecutar();
  } catch (error) {
    if (error instanceof HttpException) return error;
    throw error;
  }
  throw new Error('esperaba una excepción HTTP, pero la llamada terminó bien');
}

function headers(
  telefono = TELEFONO,
  nonce = randomUUID().replaceAll('-', ''),
  timestamp = String(Math.floor(Date.now() / 1000)),
  secret = HMAC_SECRET,
) {
  const signature = createHmac('sha256', secret)
    .update(`${telefono}|${timestamp}|${nonce}`)
    .digest('hex');
  return { timestamp, nonce, signature };
}

function montar() {
  const valores: Record<string, string | number | undefined> = {
    WHATSAPP_SERVICE_TOKEN: SERVICE_TOKEN,
    WHATSAPP_HMAC_SECRET: HMAC_SECRET,
    // validateEnv convierte este entorno a número, como en producción.
    ACCESS_TOKEN_TTL_SECONDS: 900,
  };
  const config = {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService<EnvConfig, true>;

  // Mismo servicio JWT y mismas opciones que AuthModule registra en producción.
  const jwt = new JwtService({
    secret: JWT_SECRET,
    signOptions: { algorithm: 'HS256', expiresIn: 900 },
    verifyOptions: { algorithms: ['HS256'] },
  });

  const identidad = { resolverContacto: vi.fn() };
  const clinicas = { findOneBy: vi.fn() };
  const usuarios = { findOne: vi.fn() };
  const redis = {
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
  };
  const auditoria = { save: vi.fn().mockResolvedValue(undefined) };

  const service = new WhatsappSesionService(
    config,
    jwt,
    identidad as unknown as WhatsappIdentidadService,
    clinicas as never,
    usuarios as never,
    auditoria as never,
    redis as never,
  );
  const originalController = new WhatsappSesionController(service);
  const controller = {
    crearSesion: (dto: { telefono: string }, token: string | undefined) => {
      const h = headers(dto.telefono);
      return originalController.crearSesion(dto, token, h.timestamp, h.nonce, h.signature);
    },
  };

  return {
    controller,
    originalController,
    jwt,
    valores,
    identidad,
    clinicas,
    usuarios,
    redis,
    auditoria,
  };
}

/** Cadena completa: contacto verificado, clínica activa, cuenta designada. */
function cadenaValida(m: ReturnType<typeof montar>): void {
  m.identidad.resolverContacto.mockResolvedValue({
    ok: true,
    contacto: { id: 'ct-1', clinicaId: CLINICA_ID, doctorId: DOCTOR_ID, estado: 'verificado' },
  });
  m.clinicas.findOneBy.mockResolvedValue({
    id: CLINICA_ID,
    activo: true,
    usuarioBotId: USUARIO_ID,
  });
  m.usuarios.findOne.mockResolvedValue({
    id: USUARIO_ID,
    clinicaId: CLINICA_ID,
    activo: true,
    rol: { nombre: 'clinica' },
  });
}

describe('POST /internal/whatsapp/sesion', () => {
  // Referencia por descriptor: leerla como método sin vincular dispara
  // unbound-method en oxlint.
  const handler = (): ((...args: never[]) => unknown) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      WhatsappSesionController.prototype,
      'crearSesion',
    );
    if (!descriptor?.value) throw new Error('crearSesion no está definida');
    return descriptor.value;
  };

  it('queda fuera del guard JWT global (@Public)', () => {
    expect(new Reflector().get(IS_PUBLIC_KEY, handler())).toBe(true);
  });

  it('fija 200 en el happy path (POST respondería 201 sin @HttpCode)', () => {
    expect(new Reflector().get(HTTP_CODE_METADATA, handler())).toBe(
      HttpStatus.OK,
    );
  });

  it('responde 503 cuando WHATSAPP_SERVICE_TOKEN no está definido, nunca 401', async () => {
    const m = montar();
    delete m.valores.WHATSAPP_SERVICE_TOKEN;

    const error = await rechazo(() =>
      m.controller.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN),
    );

    expect(error.getStatus()).toBe(503);
    expect(error.message).toMatch(/no está configurada/);
    // Ni siquiera con el header correcto se pasa de largo: el endpoint está caído.
    expect(m.identidad.resolverContacto).not.toHaveBeenCalled();
  });

  it('responde 401 con el mismo mensaje con el header ausente o incorrecto', async () => {
    const m = montar();

    const ausente = await rechazo(() =>
      m.controller.crearSesion({ telefono: TELEFONO }, undefined),
    );
    const incorrecto = await rechazo(() =>
      m.controller.crearSesion({ telefono: TELEFONO }, 'otro-token'),
    );

    expect(ausente.getStatus()).toBe(401);
    expect(incorrecto.getStatus()).toBe(401);
    // No se revela cuál de los dos falló: mismo status, mismo mensaje.
    expect(ausente.message).toBe(incorrecto.message);
    expect(m.identidad.resolverContacto).not.toHaveBeenCalled();
  });

  it('responde 403 con un solo mensaje para cualquier contacto no verificado', async () => {
    const m = montar();
    const mensajes: string[] = [];

    for (const motivo of ['telefono_invalido', 'no_autorizado', 'no_verificado']) {
      m.identidad.resolverContacto.mockResolvedValue({ ok: false, motivo });
      const error = await rechazo(() =>
        m.controller.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN),
      );
      expect(error.getStatus()).toBe(403);
      mensajes.push(error.message);
    }

    expect(new Set(mensajes).size).toBe(1);
    // El rechazo no llega ni a la clínica ni a la cuenta designada.
    expect(m.clinicas.findOneBy).not.toHaveBeenCalled();
    expect(m.usuarios.findOne).not.toHaveBeenCalled();
  });

  it('responde 403 con el mismo mensaje cuando la clínica está inactiva', async () => {
    const m = montar();
    m.identidad.resolverContacto.mockResolvedValue({
      ok: true,
      contacto: { id: 'ct-1', clinicaId: CLINICA_ID, doctorId: null, estado: 'verificado' },
    });
    m.clinicas.findOneBy.mockResolvedValue({
      id: CLINICA_ID,
      activo: false,
      usuarioBotId: USUARIO_ID,
    });

    const inactiva = await rechazo(() =>
      m.controller.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN),
    );
    expect(inactiva.getStatus()).toBe(403);
    expect(m.usuarios.findOne).not.toHaveBeenCalled();

    m.identidad.resolverContacto.mockResolvedValue({
      ok: false,
      motivo: 'no_verificado',
    });
    const noVerificado = await rechazo(() =>
      m.controller.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN),
    );

    // Mismo mensaje en ambos casos: el llamante no distingue el motivo.
    expect(inactiva.getStatus()).toBe(noVerificado.getStatus());
    expect(inactiva.message).toBe(noVerificado.message);
  });

  it('responde 409 pidiendo designar una cuenta cuando falta usuarioBotId', async () => {
    const m = montar();
    m.identidad.resolverContacto.mockResolvedValue({
      ok: true,
      contacto: { id: 'ct-1', clinicaId: CLINICA_ID, doctorId: null, estado: 'verificado' },
    });
    m.clinicas.findOneBy.mockResolvedValue({
      id: CLINICA_ID,
      activo: true,
      usuarioBotId: null,
    });

    const error = await rechazo(() =>
      m.controller.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN),
    );

    expect(error.getStatus()).toBe(409);
    expect(error.message).toMatch(/administrador/);
    expect(error.message).toMatch(/designe/);
    expect(m.usuarios.findOne).not.toHaveBeenCalled();
  });

  it('responde 409 con el mismo mensaje si la cuenta designada no representa a esta clínica', async () => {
    const cuentas: Record<string, unknown>[] = [
      // Cuenta de OTRA clínica: el alcance saldría de la cuenta, no del contacto (S3).
      { id: USUARIO_ID, clinicaId: '99', activo: true, rol: { nombre: 'clinica' } },
      // Cuenta desactivada: no se acuña token para una cuenta apagada.
      { id: USUARIO_ID, clinicaId: CLINICA_ID, activo: false, rol: { nombre: 'clinica' } },
      // Sin clínica asignada: /mi-clinica/* la rechazaría en cada llamada.
      { id: USUARIO_ID, clinicaId: null, activo: true, rol: { nombre: 'clinica' } },
    ];
    const mensajes: string[] = [];

    for (const cuenta of cuentas) {
      const m = montar();
      m.identidad.resolverContacto.mockResolvedValue({
        ok: true,
        contacto: { id: 'ct-1', clinicaId: CLINICA_ID, doctorId: null, estado: 'verificado' },
      });
      m.clinicas.findOneBy.mockResolvedValue({
        id: CLINICA_ID,
        activo: true,
        usuarioBotId: USUARIO_ID,
      });
      m.usuarios.findOne.mockResolvedValue(cuenta);

      const error = await rechazo(() =>
        m.controller.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN),
      );
      expect(error.getStatus()).toBe(409);
      mensajes.push(error.message);
    }

    expect(new Set(mensajes).size).toBe(1);
  });

  it('responde 503 si falta cualquiera de los dos secretos de configuración', async () => {
    for (const clave of ['WHATSAPP_SERVICE_TOKEN', 'WHATSAPP_HMAC_SECRET']) {
      const m = montar();
      delete m.valores[clave];
      const h = headers();
      const error = await rechazo(() => m.originalController.crearSesion(
        { telefono: TELEFONO }, SERVICE_TOKEN, h.timestamp, h.nonce, h.signature,
      ));
      expect(error.getStatus()).toBe(503);
    }
  });

  it('responde 401 con el mismo mensaje ante todos los HMAC inválidos', async () => {
    const casos = [
      { ...headers(), signature: '0'.repeat(64) },
      headers(TELEFONO, undefined, String(Math.floor(Date.now() / 1000) - 121)),
      headers(TELEFONO, undefined, String(Math.floor(Date.now() / 1000) + 121)),
      headers(TELEFONO, undefined, undefined, SERVICE_TOKEN),
    ];
    const mensajes: string[] = [];
    for (const h of casos) {
      const m = montar();
      const error = await rechazo(() => m.originalController.crearSesion(
        { telefono: TELEFONO }, SERVICE_TOKEN, h.timestamp, h.nonce, h.signature,
      ));
      expect(error.getStatus()).toBe(401);
      mensajes.push(error.message);
    }
    const m = montar();
    const h = headers(TELEFONO, 'nonce-reutilizable-1234');
    m.redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    await m.originalController.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN, h.timestamp, h.nonce, h.signature).catch(() => undefined);
    const repetido = await rechazo(() => m.originalController.crearSesion(
      { telefono: TELEFONO }, SERVICE_TOKEN, h.timestamp, h.nonce, h.signature,
    ));
    expect(repetido.getStatus()).toBe(401);
    mensajes.push(repetido.message);
    expect(new Set(mensajes).size).toBe(1);
    expect(mensajes[0]).toBe('Token de servicio inválido.');
  });

  it('limita la séptima sesión de una clínica y audita la limitación', async () => {
    const m = montar();
    cadenaValida(m);
    let llamadas = 0;
    m.redis.incr.mockImplementation(async () => Math.ceil(++llamadas / 2));
    for (let i = 0; i < 6; i++) {
      const h = headers(TELEFONO, `nonce-${String(i).padStart(16, '0')}`);
      await m.originalController.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN, h.timestamp, h.nonce, h.signature);
    }
    const error = await rechazo(() => m.originalController.crearSesion(
      { telefono: TELEFONO }, SERVICE_TOKEN, ...Object.values(headers()) as [string, string, string],
    ));
    expect(error.getStatus()).toBe(429);
    expect(m.auditoria.save).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'limitada' }));
  });

  it('no consume cuota cuando el contacto no está verificado y permite el intento siguiente', async () => {
    const m = montar();
    m.identidad.resolverContacto.mockResolvedValueOnce({ ok: false, motivo: 'no_verificado' });
    const rechazado = await rechazo(() => m.originalController.crearSesion(
      { telefono: TELEFONO }, SERVICE_TOKEN, ...Object.values(headers()) as [string, string, string],
    ));
    expect(rechazado.getStatus()).toBe(403);
    expect(m.redis.incr).not.toHaveBeenCalled();
    cadenaValida(m);
    await expect(m.originalController.crearSesion(
      { telefono: TELEFONO }, SERVICE_TOKEN, ...Object.values(headers()) as [string, string, string],
    )).resolves.toMatchObject({ clinicaId: CLINICA_ID });
  });

  it('audita cada resultado de elegibilidad rechazado', async () => {
    const casos = [
      { resultado: 'rechazada_contacto_no_verificado', configurar: (m: ReturnType<typeof montar>) => m.identidad.resolverContacto.mockResolvedValue({ ok: false, motivo: 'no_verificado' }) },
      { resultado: 'rechazada_clinica_inactiva', configurar: (m: ReturnType<typeof montar>) => { m.identidad.resolverContacto.mockResolvedValue({ ok: true, contacto: { id: 'ct-1', clinicaId: CLINICA_ID, doctorId: null } }); m.clinicas.findOneBy.mockResolvedValue({ id: CLINICA_ID, activo: false }); } },
      { resultado: 'rechazada_cuenta_no_designada', configurar: (m: ReturnType<typeof montar>) => { m.identidad.resolverContacto.mockResolvedValue({ ok: true, contacto: { id: 'ct-1', clinicaId: CLINICA_ID, doctorId: null } }); m.clinicas.findOneBy.mockResolvedValue({ id: CLINICA_ID, activo: true, usuarioBotId: null }); } },
      { resultado: 'rechazada_cuenta_inutilizable', configurar: (m: ReturnType<typeof montar>) => { m.identidad.resolverContacto.mockResolvedValue({ ok: true, contacto: { id: 'ct-1', clinicaId: CLINICA_ID, doctorId: null } }); m.clinicas.findOneBy.mockResolvedValue({ id: CLINICA_ID, activo: true, usuarioBotId: USUARIO_ID }); m.usuarios.findOne.mockResolvedValue({ id: USUARIO_ID, clinicaId: '99', activo: true, rol: { nombre: 'clinica' } }); } },
    ];
    for (const caso of casos) {
      const m = montar(); caso.configurar(m);
      await rechazo(() => m.originalController.crearSesion({ telefono: TELEFONO }, SERVICE_TOKEN, ...Object.values(headers()) as [string, string, string]));
      expect(m.auditoria.save).toHaveBeenCalledWith(expect.objectContaining({ resultado: caso.resultado }));
    }
  });

  it('200: devuelve un token corto que el guard de la API acepta para esa cuenta', async () => {
    const m = montar();
    cadenaValida(m);

    const respuesta = await m.controller.crearSesion(
      { telefono: TELEFONO },
      SERVICE_TOKEN,
    );

    expect(m.identidad.resolverContacto).toHaveBeenCalledWith(TELEFONO);
    // Solo lo que el bot necesita: ni la cuenta completa ni su hash de contraseña.
    expect(Object.keys(respuesta).sort()).toEqual([
      'accessToken',
      'clinicaId',
      'doctorId',
      'expiresIn',
    ]);
    expect(respuesta.clinicaId).toBe(CLINICA_ID);
    expect(respuesta.doctorId).toBe(DOCTOR_ID);
    expect(respuesta.expiresIn).toBe(900);

    // Firma y claims pasan por la misma verificación que el guard global.
    const payload = (await m.jwt.verifyAsync(respuesta.accessToken)) as {
      sub: string;
      rol: string;
      sid: string;
      scope?: string;
      iat: number;
      exp: number;
    };
    expect(payload.sub).toBe(USUARIO_ID);
    expect(payload.rol).toBe('clinica');
    expect(payload.scope).toBe('whatsapp-bot');
    expect(payload.sid).toMatch(UUID_RE);
    expect(payload.exp - payload.iat).toBe(900);
    expect(parseJwtPayload(payload)).toEqual({
      id: USUARIO_ID,
      rol: 'clinica',
      sid: payload.sid,
      scope: 'whatsapp-bot',
    });
    expect(
      new JwtStrategy({ get: () => JWT_SECRET } as never).validate(payload),
    ).toEqual({ id: USUARIO_ID, rol: 'clinica', sid: payload.sid, scope: 'whatsapp-bot' });
  });
});
