import type { ServerSession } from "./client";
import type { Rol, Usuario } from "./types";

export type PortalAccess =
  | { kind: "allowed"; usuario: Usuario }
  | { kind: "forbidden"; usuario: Usuario }
  | { kind: "login" }
  | { kind: "unavailable" };

/** Decides what a protected portal layout should do with a server session. */
export function resolvePortalAccess(
  session: ServerSession,
  allowedRoles: readonly Rol[],
): PortalAccess {
  if (session.status === "unauthorized") return { kind: "login" };
  if (session.status === "unavailable") return { kind: "unavailable" };
  return allowedRoles.includes(session.usuario.rol)
    ? { kind: "allowed", usuario: session.usuario }
    : { kind: "forbidden", usuario: session.usuario };
}
