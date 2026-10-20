import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { fetchSessionOnServer, resolvePortalAccess, safeRedirectPath } from "@repo/api-client";
import type { Rol } from "@repo/api-client";
import { API_URL } from "./api";

export const ALLOWED_ROLES: readonly Rol[] = ["odontologo", "asistente"];

/** Header set by `proxy.ts` with the sanitized path of the current request. */
export const PATH_HEADER = "x-portal-path";

/**
 * Authoritative server-side session check (`GET /auth/me`), deduplicated per
 * request. Pages must not rely on the layout alone: call this in any page that
 * renders protected data.
 */
export const getAccess = cache(async () => {
  const token = (await cookies()).get("auth_token")?.value;
  const session = await fetchSessionOnServer({
    baseUrl: API_URL,
    cookie: token ? `auth_token=${token}` : "",
  });
  return resolvePortalAccess(session, ALLOWED_ROLES);
});

export async function getRequestPath(): Promise<string> {
  return safeRedirectPath((await headers()).get(PATH_HEADER), "/");
}
