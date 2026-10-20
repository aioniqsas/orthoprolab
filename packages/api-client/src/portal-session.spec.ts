import { describe, expect, it } from "vitest";
import { resolvePortalAccess } from "./portal-session";
import type { Usuario } from "./types";

const user = (rol: Usuario["rol"]): Usuario => ({
  id: "1", nombres: "A", apellidos: "B", correo: "a@b.co", rol,
});

describe("resolvePortalAccess", () => {
  it("allows a permitted role", () => {
    const u = user("administrador");
    expect(
      resolvePortalAccess({ status: "authenticated", usuario: u }, ["administrador"]),
    ).toEqual({ kind: "allowed", usuario: u });
  });
  it("flags a role that is not allowed", () => {
    const u = user("odontologo");
    expect(
      resolvePortalAccess({ status: "authenticated", usuario: u }, ["administrador"]),
    ).toEqual({ kind: "forbidden", usuario: u });
  });
  it("redirects unauthorized and reports unavailable", () => {
    expect(resolvePortalAccess({ status: "unauthorized" }, ["asistente"])).toEqual({ kind: "login" });
    expect(resolvePortalAccess({ status: "unavailable" }, ["asistente"])).toEqual({ kind: "unavailable" });
  });
});
