import { createHmac, randomUUID } from 'node:crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation.js';
import type { WhatsappIdentidadService } from './whatsapp-identidad.service.js';
import { WhatsappLlamadaController } from './whatsapp-llamada.controller.js';
import { WhatsappLlamadaService } from './whatsapp-llamada.service.js';

const SERVICE_TOKEN = 'shared-service-token-for-the-bot';
const HMAC_SECRET = 'test-hmac-secret';
const LAB_EMAIL = 'lab@orthoprolab.test';
const TELEFONO = '+573001234567';
const CLINICA_ID = '42';
const CONTACTO_ID = 'ct-1';

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

function cabeceras(telefono = TELEFONO, secreto = HMAC_SECRET) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomUUID().replaceAll('-', '');
  const signature = createHmac('sha256', secreto)
    .update(`${telefono}|${timestamp}|${nonce}`)
    .digest('hex');
  return { timestamp, nonce, signature };
}

function montar() {
  const valores: Record<string, string | undefined> = {
    WHATSAPP_SERVICE_TOKEN: SERVICE_TOKEN,
    WHATSAPP_HMAC_SECRET: HMAC_SECRET,
    WHATSAPP_LAB_EMAIL: LAB_EMAIL,
  };
  const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService<EnvConfig, true>;
  const identidad = { resolverContacto: vi.fn() };
  const clinicas = { findOneBy: vi.fn() };
  const redis = {
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
  };
  const auditoria = { save: vi.fn().mockResolvedValue(undefined) };
  const llamadas = { save: vi.fn().mockResolvedValue(undefined) };
  const correo = { enqueue: vi.fn().mockResolvedValue({ sent: true }) };

  const service = new WhatsappLlamadaService(
    config,
    identidad as unknown as WhatsappIdentidadService,
    clinicas as never,
    auditoria as never,
    llamadas as never,
    correo as never,
    redis as never,
  );
  const controller = new WhatsappLlamadaController(service);
  const llamada = (telefono: string, token: string | undefined = SERVICE_TOKEN, secreto = HMAC_SECRET) => {
    const h = cabeceras(telefono, secreto);
    return controller.registrarLlamada(
      { telefono },
      token,
      h.timestamp,
      h.nonce,
      h.signature,
    );
  };
  const auditoriaLlamada = (telefono: string, intencion: string, paso: string, token = SERVICE_TOKEN) => {
    const h = cabeceras(telefono);
    return controller.registrarIntencion(
      { telefono, intencion, paso },
      token,
      h.timestamp,
      h.nonce,
      h.signature,
    );
  };
  return {
    controller,
    service,
    valores,
    identidad,
    clinicas,
    redis,
    auditoria,
    llamadas,
    correo,
    llamada,
    auditoriaLlamada,
  };
}

/** Contacto verificado con clínica activa: la cadena mínima para llegar a grabar. */
function contactoValido(m: ReturnType<typeof montar>): void {
  m.identidad.resolverContacto.mockResolvedValue({
    ok: true,
    contacto: { id: CONTACTO_ID, clinicaId: CLINICA_ID, doctorId: null, estado: 'verificado' },
  });
  m.clinicas.findOneBy.mockResolvedValue({ id: CLINICA_ID, activo: true, nombre: 'Clínica Alfa' });
}

describe('POST /internal/whatsapp/llamada', () => {
  it('200: graba la fila con los campos correctos, audita y encola un correo', async () => {
    const m = montar();
    contactoValido(m);
    await expect(m.llamada(TELEFONO)).resolves.toBeUndefined();
    expect(m.llamadas.save).toHaveBeenCalledTimes(1);
    const fila = m.llamadas.save.mock.calls[0]![0] as Record<string, unknown>;
    expect(fila['contactoId']).toBe(CONTACTO_ID);
    expect(fila['clinicaId']).toBe(CLINICA_ID);
    expect(fila['motivo']).toBeTruthy();
    expect(fila['atendida']).toBe(false);
    expect(JSON.stringify(fila)).not.toContain(TELEFONO);
    expect(m.correo.enqueue).toHaveBeenCalledTimes(1);
    const correo = m.correo.enqueue.mock.calls[0]![0] as { to: string; subject: string; text: string };
    expect(correo.to).toBe(LAB_EMAIL);
    expect(correo.text).toContain('Clínica Alfa');
    expect(correo.text).toContain(CONTACTO_ID);
    expect(m.auditoria.save).toHaveBeenCalledTimes(1);
    const audit = m.auditoria.save.mock.calls[0]![0] as Record<string, unknown>;
    expect(audit['intencion']).toBe('llamada');
    expect(JSON.stringify(audit)).not.toContain(TELEFONO);
  });

  it('401 sin el token de servicio', async () => {
    const m = montar();
    const e = await rechazo(() => m.llamada(TELEFONO, 'otro-token'));
    expect(e.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(m.llamadas.save).not.toHaveBeenCalled();
  });

  it('401 con firma inválida', async () => {
    const m = montar();
    const e = await rechazo(() => m.llamada(TELEFONO, SERVICE_TOKEN, HMAC_SECRET.replace('test', 'mal')));
    expect(e.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('403 con un número que no es contacto verificado', async () => {
    const m = montar();
    m.identidad.resolverContacto.mockResolvedValue({ ok: false, motivo: 'no_autorizado' });
    const e = await rechazo(() => m.llamada(TELEFONO));
    expect(e.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(m.llamadas.save).not.toHaveBeenCalled();
  });

  it('sin WHATSAPP_LAB_EMAIL la solicitud se graba y solo falta el correo', async () => {
    // La solicitud de llamada no se pierde por una integración sin configurar: se registra y se avisa en el log.
    const m = montar();
    contactoValido(m);
    delete m.valores['WHATSAPP_LAB_EMAIL'];
    await m.llamada(TELEFONO);
    expect(m.llamadas.save).toHaveBeenCalledTimes(1);
    expect(m.correo.enqueue).not.toHaveBeenCalled();
  });

  it('503 sin Redis (sin nonce ni cuotas)', async () => {
    const m = montar();
    (m.service as unknown as { redis: unknown }).redis = undefined;
    const e = await rechazo(() => m.llamada(TELEFONO));
    expect(e.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('429 al superar el tope diario por contacto', async () => {
    const m = montar();
    contactoValido(m);
    m.redis.incr.mockResolvedValue(99);
    const e = await rechazo(() => m.llamada(TELEFONO));
    expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(m.llamadas.save).not.toHaveBeenCalled();
  });

  it('200 aunque la cola de correo falle: la solicitud queda grabada', async () => {
    const m = montar();
    contactoValido(m);
    m.correo.enqueue.mockRejectedValue(new Error('redis abajo'));
    await expect(m.llamada(TELEFONO)).resolves.toBeUndefined();
    expect(m.llamadas.save).toHaveBeenCalledTimes(1);
  });
});

describe('POST /internal/whatsapp/auditoria', () => {
  it('200: graba intención y paso con el tag del emisor, sin cuerpo ni nombres', async () => {
    const m = montar();
    contactoValido(m);
    await expect(m.auditoriaLlamada(TELEFONO, 'estado', 'pedido-numero')).resolves.toBeUndefined();
    const fila = m.auditoria.save.mock.calls[0]![0] as Record<string, unknown>;
    expect(fila['intencion']).toBe('estado');
    expect(fila['paso']).toBe('pedido-numero');
    expect(String(fila['emisorTag'])).toMatch(/^[0-9a-f]{16}$/);
    expect(fila['contactoId']).toBe(CONTACTO_ID);
    expect(JSON.stringify(fila)).not.toContain(TELEFONO);
  });

  it('rechaza una intención fuera de la lista', async () => {
    const m = montar();
    const e = await rechazo(() => m.auditoriaLlamada(TELEFONO, 'robar', 'x'));
    expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('los fallos de auditoría nunca rompen al bot (se tragan en silencio)', async () => {
    const m = montar();
    contactoValido(m);
    m.auditoria.save.mockRejectedValue(new Error('db abajo'));
    await expect(m.auditoriaLlamada(TELEFONO, 'menu', 'menu')).resolves.toBeUndefined();
  });
});
