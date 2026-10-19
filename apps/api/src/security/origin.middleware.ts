import type { NextFunction, Request, RequestHandler, Response } from 'express';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defense in depth. Browsers ALWAYS send `Origin` on cross-site unsafe
 * requests, so when it is present on POST/PUT/PATCH/DELETE it must be in the
 * allow-list. Requests without `Origin` (curl, server-to-server) are allowed:
 * they cannot be driven by a victim's browser. `SameSite` on the auth cookie
 * remains the primary CSRF defense; this check backs it up.
 */
export function createOriginCheck(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (
      UNSAFE_METHODS.has(req.method) &&
      origin !== undefined &&
      !allowed.has(origin)
    ) {
      res
        .status(403)
        .json({ statusCode: 403, message: 'Forbidden', error: 'Forbidden' });
      return;
    }
    next();
  };
}
