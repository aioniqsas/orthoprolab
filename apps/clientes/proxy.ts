import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeRedirectPath } from "@repo/api-client/redirect";

// Only a UX gate: the authoritative check is the server-side `/auth/me` call.
const PUBLIC_PATHS = new Set(["/login", "/restablecer-password"]);
const PATH_HEADER = "x-portal-path";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const path = safeRedirectPath(`${pathname}${search}`, "/");

  if (!request.cookies.has("auth_token")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, path);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip Next internals and any path with a file extension (static assets).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
