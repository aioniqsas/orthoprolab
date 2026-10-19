import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { EnvConfig } from '../config/env.validation.js';
import type { AuthUser } from './auth-user.js';
import { AUTH_COOKIE } from './auth.constants.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads the token from the auth cookie ONLY (never from Authorization). */
export function extractAuthCookie(req: Request): string | null {
  const cookies = (req as { cookies?: Record<string, unknown> }).cookies;
  const value = cookies?.[AUTH_COOKIE];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Validates the claims shape; null means the token is not acceptable. */
export function parseJwtPayload(payload: unknown): AuthUser | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { sub, rol, sid } = payload as Record<string, unknown>;
  if (
    typeof sub !== 'string' ||
    !UUID.test(sub) ||
    typeof rol !== 'string' ||
    rol === '' ||
    typeof sid !== 'string' ||
    !UUID.test(sid)
  ) {
    return null;
  }
  return { id: sub, rol, sid };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<EnvConfig, true>) {
    super({
      jwtFromRequest: extractAuthCookie,
      secretOrKey: Buffer.from(
        config.get('JWT_SECRET', { infer: true }),
        'base64',
      ),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  validate(payload: unknown): AuthUser | false {
    return parseJwtPayload(payload) ?? false;
  }
}
