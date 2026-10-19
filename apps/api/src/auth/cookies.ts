import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE, REFRESH_COOKIE } from './auth.constants.js';

export interface CookieSettings {
  secure: boolean;
  sameSite: 'strict' | 'lax';
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

  /** Scoped to /auth so the browser only sends it to the auth routes. */
  setRefresh(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.base('/auth'),
      maxAge: this.settings.refreshTtlDays * 86_400_000,
    });
  }

  clearAll(res: Response): void {
    res.clearCookie(AUTH_COOKIE, this.base('/'));
    res.clearCookie(REFRESH_COOKIE, this.base('/auth'));
  }
}
