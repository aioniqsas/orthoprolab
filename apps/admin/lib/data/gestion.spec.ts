import { describe, expect, it } from "vitest";
import {
  filterServicios,
  filterUsuarios,
  maskCedula,
  parseServicioFilters,
  parseUsuarioFilters,
  rolLabel,
} from "./gestion";
import { formatCop } from "./helpers";
import { PERMISOS } from "./permisos";
import { ROLES } from "./types";
import type { Servicio, Usuario } from "./types";

const u = (id: string, nombres: string, rol: Usuario["rol"], correo: string): Usuario => ({
  id,
  nombres,
  apellidos: "Prueba",
  correo,
  rol,
  activo: true,
  cedulaEnmascarada: "***",
});

const USUARIOS = [
  u("1", "Ángela", "administrador", "angela@ejemplo.test"),
  u("2", "Camilo", "odontologo", "camilo@ejemplo.test"),
  u("3", "Sofía", "asistente", "sofia@ejemplo.test"),
];

const s = (id: string, nombre: string, activo: boolean): Servicio => ({
  id,
  nombre,
  descripcion: `Descripción de ${nombre}`,
  precio: "100000.00",
  activo,
});
const SERVICIOS = [s("1", "Ortodoncia Fija", true), s("2", "Retenedores y Férulas", false)];

describe("maskCedula", () => {
  it("keeps only the last 3 digits", () => {
    expect(maskCedula("1020304050")).toBe("*******050");
  });
  it("ignores separators", () => {
    expect(maskCedula("1.020.304.050")).toBe("*******050");
  });
  it("masks everything when 3 digits or fewer", () => {
    expect(maskCedula("123")).toBe("***");
    expect(maskCedula("")).toBe("");
  });
});

describe("rolLabel", () => {
  it("returns Spanish labels", () => {
    expect(rolLabel("odontologo")).toBe("Odontólogo");
    expect(rolLabel("administrador")).toBe("Administrador");
    expect(rolLabel("asistente")).toBe("Asistente");
  });
});

describe("usuarios filters", () => {
  it("filters by role", () => {
    expect(filterUsuarios(USUARIOS, { rol: "asistente" }).map((x) => x.id)).toEqual(["3"]);
  });
  it("searches name or email ignoring accents and case", () => {
    expect(filterUsuarios(USUARIOS, { q: "angela" })).toHaveLength(1);
    expect(filterUsuarios(USUARIOS, { q: "SOFIA@" })).toHaveLength(1);
  });
  it("returns everything without filters", () => {
    expect(filterUsuarios(USUARIOS, {})).toHaveLength(3);
  });
  it("parses params and ignores invalid roles", () => {
    expect(parseUsuarioFilters({ rol: "asistente", q: " x " })).toEqual({ rol: "asistente", q: "x" });
    expect(parseUsuarioFilters({ rol: "root" }).rol).toBeUndefined();
  });
});

describe("servicios filters", () => {
  it("filters by active state", () => {
    expect(filterServicios(SERVICIOS, { activo: false }).map((x) => x.id)).toEqual(["2"]);
    expect(filterServicios(SERVICIOS, { activo: true }).map((x) => x.id)).toEqual(["1"]);
  });
  it("searches name ignoring accents", () => {
    expect(filterServicios(SERVICIOS, { q: "ferulas" })).toHaveLength(1);
  });
  it("parses activo param", () => {
    expect(parseServicioFilters({ activo: "1" }).activo).toBe(true);
    expect(parseServicioFilters({ activo: "0" }).activo).toBe(false);
    expect(parseServicioFilters({ activo: "x" }).activo).toBeUndefined();
  });
});

describe("price formatting", () => {
  it("formats a numeric string as COP with es-CO separators", () => {
    expect(formatCop("1250000.00")).toMatch(/1\.250\.000/);
  });
});

describe("PERMISOS", () => {
  it("defines every role in every row", () => {
    for (const fila of PERMISOS) {
      expect(Object.keys(fila.roles).sort()).toEqual([...ROLES].sort());
    }
  });
  it("only the administrador enters the admin portal", () => {
    const fila = PERMISOS.find((p) => p.id === "portal-admin")!;
    expect(fila.roles.administrador.nivel).toBe("si");
    expect(fila.roles.odontologo.nivel).toBe("no");
    expect(fila.roles.asistente.nivel).toBe("no");
  });
  it("assistants act only through delegation, never directly", () => {
    const fila = PERMISOS.find((p) => p.id === "ordenes-propias")!;
    expect(fila.roles.asistente.nivel).toBe("delegado");
  });
  it("keeps undecided rules marked as por_definir", () => {
    expect(PERMISOS.some((p) => Object.values(p.roles).some((r) => r.nivel === "por_definir"))).toBe(true);
  });
});
