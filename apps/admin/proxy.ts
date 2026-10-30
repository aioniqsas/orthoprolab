import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isJwtExpired, renewSessionOnce } from "@repo/api-client";
import { safeRedirectPath } from "@repo/api-client/redirect";

// Optimistic gate only: the authoritative check is the server-side `/auth/me` call.
const PUBLIC_PATHS = new Set(["/login", "/restablecer-password"]);
const PATH_HEADER = "x-portal-path";
const AUTH_COOKIE = "auth_token";
const REFRESH_COOKIE = "refresh_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

function toLogin(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

/** Cookie header with the rotated tokens, preserving unrelated cookies. */
function renewedCookieHeader(
  request: NextRequest,
  session: { accessToken: string; refreshToken: string },
): string {
  const parts = request.cookies
    .getAll()
    .filter((cookie) => cookie.name !== AUTH_COOKIE && cookie.name !== REFRESH_COOKIE)
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  parts.push(`${AUTH_COOKIE}=${session.accessToken}`);
  parts.push(`${REFRESH_COOKIE}=${session.refreshToken}`);
  return parts.join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const path = safeRedirectPath(`${pathname}${search}`, "/");
  const accessToken = request.cookies.get(AUTH_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const expired = isJwtExpired(accessToken);
  const renewed = expired && refreshToken ? await renewSessionOnce(API_URL, refreshToken) : null;
  if (!renewed && expired) return toLogin(request, path);

  const headers = new Headers(request.headers);
  if (renewed) headers.set("cookie", renewedCookieHeader(request, renewed));
  headers.set(PATH_HEADER, path);

  const response = NextResponse.next({ request: { headers } });
  // Forward the API's Set-Cookie verbatim so attributes (httpOnly, SameSite,
  // Secure, maxAge) stay defined in one place.
  if (renewed) for (const cookie of renewed.setCookies) response.headers.append("set-cookie", cookie);
  return response;
}

export const config = {
  // Skip Next internals and any path with a file extension (static assets).
  matcher: ["/((?!_next/|api-proxy/|.*\\..*).*)"],
};
