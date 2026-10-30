import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE, REFRESH_COOKIE } from './auth.constants.js';

export interface CookieSettings {
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  accessTtlSeconds: number;
  refreshTtlDays: number;
}

/** The single place that decides cookie attributes (set and clear match). */
export class AuthCookies {
  constructor(private readonly settings: CookieSettings) {}

  private base(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.settings.secure,
      sameSite: this.settings.sameSite,
      path,
    };
  }

  setAccess(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE, token, {
      ...this.base('/'),
      maxAge: this.settings.accessTtlSeconds * 1000,
    });
  }

  /**
   * Path `/` (not `/auth`): the portal proxies and server components read the
   * cookie to renew the session before the access token expires. It stays
   * httpOnly and the refresh endpoint is POST-only with SameSite=strict.
   */
  setRefresh(res: Response, token: string): void {
    this.clearLegacyRefresh(res);
    res.cookie(REFRESH_COOKIE, token, {
      ...this.base('/'),
      maxAge: this.settings.refreshTtlDays * 86_400_000,
    });
  }

  /**
   * Older builds scoped the refresh cookie to `/auth`. A stale duplicate takes
   * precedence on `/auth/*` requests and would be seen as token reuse, so every
   * write drops it.
   */
  private clearLegacyRefresh(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.base('/auth'));
  }

  clearAll(res: Response): void {
    res.clearCookie(AUTH_COOKIE, this.base('/'));
    res.clearCookie(REFRESH_COOKIE, this.base('/'));
    this.clearLegacyRefresh(res);
  }
}
