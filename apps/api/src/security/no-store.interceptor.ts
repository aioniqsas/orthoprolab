import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { Observable } from 'rxjs';

/**
 * Adds `Cache-Control: no-store` so credentials/session data are never cached.
 * Auth controllers should use it: @UseInterceptors(NoStoreInterceptor).
 */
@Injectable()
export class NoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    return next.handle();
  }
}

/**
 * Same headers as NoStoreInterceptor but as middleware, so responses produced
 * before any interceptor runs (guard 401s, throttler 429s) are not cacheable
 * either. Mounted on `/auth` by configureApp.
 */
export function noStoreMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}
