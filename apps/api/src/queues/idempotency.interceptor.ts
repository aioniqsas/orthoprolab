import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Redis } from 'ioredis';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { IDEMPOTENCY_TTL_SECONDS, RETRY_REDIS } from './queues.constants.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

interface CachedResponse {
  status: number;
  body: unknown;
}

/**
 * Makes mutating requests replayable: a request carrying `Idempotency-Key`
 * stores its answer for a day, and a replay of the same key returns that answer
 * without running the handler again. Requests without the header are untouched.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(RETRY_REDIS) private readonly redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id?: string } }>();
    if (!MUTATING.has(req.method)) return next.handle();

    const header = req.headers['idempotency-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (!key || !KEY_PATTERN.test(key)) return next.handle();

    const res = context.switchToHttp().getResponse<Response>();
    const scope = req.user?.id ?? req.ip ?? 'anon';
    const cacheKey = `idem:v1:${scope}:${req.method}:${req.originalUrl}:${key}`;

    return from(this.redis.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          const stored = JSON.parse(cached) as CachedResponse;
          res.status(stored.status);
          return of(stored.body);
        }
        return next.handle().pipe(
          tap((body) => {
            // Only successful answers are replayed: an error must run again.
            if (res.statusCode >= 400) return;
            void this.redis
              .set(
                cacheKey,
                JSON.stringify({ status: res.statusCode, body }),
                'EX',
                IDEMPOTENCY_TTL_SECONDS,
              )
              .catch(() => undefined);
          }),
        );
      }),
    );
  }
}
