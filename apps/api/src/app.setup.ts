import { ConfigService } from '@nestjs/config';
import type { NestApplicationOptions } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import type { EnvConfig } from './config/env.validation.js';
import { noStoreMiddleware } from './security/no-store.interceptor.js';
import { createOriginCheck } from './security/origin.middleware.js';
import { createValidationPipe } from './security/validation.js';

/**
 * Options for NestFactory.create / createNestApplication. Default body parsers
 * are disabled: configureApp registers a JSON-only parser with a 10kb limit
 * (urlencoded bodies are intentionally not parsed).
 */
export const APP_CREATE_OPTIONS: NestApplicationOptions = { bodyParser: false };

export const JSON_BODY_LIMIT = '10kb';

interface BodyParserError {
  status?: number;
  statusCode?: number;
  type?: string;
}

/** Applies every HTTP hardening setting. Shared by main.ts and e2e tests. */
export function configureApp(
  app: NestExpressApplication,
  config: ConfigService<EnvConfig, true> = app.get(ConfigService),
): void {
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  const origins = config.get('CORS_ORIGINS', { infer: true });

  // Client IPs (rate limiting) are only right behind a proxy when configured.
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      strictTransportSecurity: isProduction
        ? { maxAge: 31_536_000, includeSubDomains: true }
        : false,
    }),
  );
  // Credentials/session data must never be cached, errors included.
  app.use('/auth', noStoreMiddleware);

  // Disallowed origins get no CORS headers at all (not even credentials).
  app.enableCors((req: Request, callback) => {
    const origin = req.headers.origin;
    const allowed = origin !== undefined && origins.includes(origin);
    callback(
      null,
      allowed
        ? {
            origin: true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Accept'],
            maxAge: 600,
          }
        : { origin: false },
    );
  });
  app.use(createOriginCheck(origins));

  app.use(cookieParser());
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  // Body parser failures (413, malformed JSON) bypass Nest filters: answer
  // with a generic JSON body instead of Express' HTML stack trace.
  app.use(
    (
      err: BodyParserError,
      _req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (!err || typeof err !== 'object') return next(err);
      const status = err.status ?? err.statusCode;
      if (status === undefined || status < 400 || status > 499)
        return next(err);
      res.status(status).json({
        statusCode: status,
        message:
          status === 413 ? 'Payload too large' : 'Malformed request body',
        error: status === 413 ? 'Payload Too Large' : 'Bad Request',
      });
    },
  );

  app.useGlobalPipes(createValidationPipe());
  // Applies @Exclude({ toPlainOnly: true }) on entities so sensitive columns
  // (password and cedula hashes, reset tokens, cedula, correo of users) never
  // leave in a response, whatever relation loaded them.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}
