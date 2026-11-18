import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { Redis } from 'ioredis';

/**
 * Capas 1–2 de S10, compartidas por todos los endpoints internos del bot:
 * token de servicio + HMAC de `telefono|timestamp|nonce` con ventana de
 * ±120 s y nonce de un solo uso en Redis. Saber el secreto de ruteo no
 * alcanza; sin Redis no hay protección de nonce, y cada servicio decide
 * si sigue (el de sesión falla cerrado antes de llegar aquí).
 */
export interface FirmaSolicitud {
  telefono: unknown;
  token: string | undefined;
  timestamp?: string;
  nonce?: string;
  signature?: string;
}

const BAD = 'Token de servicio inválido.';

export async function verificarFirma(
  solicitud: FirmaSolicitud,
  serviceToken: string,
  hmacSecret: string,
  redis: Pick<Redis, 'set'>,
): Promise<void> {
  const same = (a: string | undefined, b: string) =>
    timingSafeEqual(createHash('sha256').update(a ?? '').digest(), createHash('sha256').update(b).digest()) && a !== undefined;
  if (!same(solicitud.token, serviceToken)) throw new UnauthorizedException(BAD);
  const seconds = Number(solicitud.timestamp);
  if (
    !Number.isInteger(seconds) ||
    Math.abs(Math.floor(Date.now() / 1000) - seconds) > 120 ||
    !solicitud.nonce ||
    !/^[A-Za-z0-9_-]{16,40}$/.test(solicitud.nonce) ||
    !solicitud.signature ||
    !/^[0-9a-f]{64}$/i.test(solicitud.signature)
  ) {
    throw new UnauthorizedException(BAD);
  }
  // A non-string phone must not fall back to '' (a signature over
  // `|timestamp|nonce` would then be accepted for `telefono: 123`).
  if (typeof solicitud.telefono !== 'string') throw new UnauthorizedException(BAD);
  const telefono = solicitud.telefono;
  const expected = createHmac('sha256', hmacSecret)
    .update(`${telefono}|${solicitud.timestamp}|${solicitud.nonce}`)
    .digest('hex');
  if (!timingSafeEqual(Buffer.from(solicitud.signature, 'hex'), Buffer.from(expected, 'hex'))) {
    throw new UnauthorizedException(BAD);
  }
  if ((await redis.set(`whatsapp:nonce:${solicitud.nonce}`, '1', 'EX', 120, 'NX')) !== 'OK') {
    throw new UnauthorizedException(BAD);
  }
}
