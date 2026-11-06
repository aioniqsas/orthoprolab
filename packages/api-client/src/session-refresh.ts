/** Same cookie names the API uses (`apps/api/src/auth/auth.constants.ts`). */
const AUTH_COOKIE = "auth_token";
const REFRESH_COOKIE = "refresh_token";

/** Renew 30s before expiry so a request in flight never carries a dead token. */
const EXPIRY_SKEW_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 5_000;

export interface RenewedSession {
  accessToken: string;
  refreshToken: string;
  /** Raw `Set-Cookie` values from the API, forwarded verbatim to the browser. */
  setCookies: string[];
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}

/**
 * Reads `exp` without verifying the signature: this only decides whether to
 * renew optimistically. `/auth/me` remains the authoritative check.
 */
export function isJwtExpired(
  token: string | undefined,
  now: number = Date.now(),
  skewMs: number = EXPIRY_SKEW_MS,
): boolean {
  if (!token) return true;
  const payload = token.split(".")[1];
  if (!payload) return true;
  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    if (typeof claims.exp !== "number") return true;
    return claims.exp * 1000 - skewMs <= now;
  } catch {
    return true;
  }
}

function cookieValue(setCookies: string[], name: string): string | undefined {
  for (const raw of setCookies) {
    const pair = raw.split(";")[0] ?? "";
    const index = pair.indexOf("=");
    if (index === -1) continue;
    if (pair.slice(0, index).trim() === name) return pair.slice(index + 1).trim();
  }
  return undefined;
}

const inFlight = new Map<string, Promise<RenewedSession | null>>();

/**
 * `POST /auth/refresh` from a server context. Never throws: any failure means
 * "no session to renew". Concurrent callers with the same refresh token share
 * one request, because the API rotates tokens and a second attempt would be
 * rejected as reuse (`apps/api/src/auth/refresh-policy.ts`).
 */
export function renewSessionOnce(
  apiUrl: string,
  refreshToken: string,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<RenewedSession | null> {
  const existing = inFlight.get(refreshToken);
  if (existing) return existing;

  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const pending = (async (): Promise<RenewedSession | null> => {
    try {
      const res = await doFetch(`${apiUrl.replace(/\/+$/, "")}/auth/refresh`, {
        method: "POST",
        headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const setCookies = res.headers.getSetCookie();
      const accessToken = cookieValue(setCookies, AUTH_COOKIE);
      const nextRefresh = cookieValue(setCookies, REFRESH_COOKIE);
      if (!accessToken || !nextRefresh) return null;
      return { accessToken, refreshToken: nextRefresh, setCookies };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      inFlight.delete(refreshToken);
    }
  })();

  inFlight.set(refreshToken, pending);
  return pending;
}
