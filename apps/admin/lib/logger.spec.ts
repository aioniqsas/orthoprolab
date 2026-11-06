import { describe, expect, it, vi } from "vitest";
import { conRegistro, crearRef, formatearLinea } from "./logger";

describe("formatearLinea", () => {
  it("produce una sola línea JSON con marca de tiempo y contexto", () => {
    const linea = formatearLinea(
      {
        nivel: "warn",
        ambito: "cuentas-cobro.enviarEmail",
        ref: "ab12cd34",
        mensaje: "error-controlado",
        datos: { cuentaId: "3", status: 400 },
      },
      new Date("2026-11-06T17:00:00.000Z"),
    );

    expect(linea).not.toContain("\n");
    expect(JSON.parse(linea)).toEqual({
      ts: "2026-11-06T17:00:00.000Z",
      nivel: "warn",
      ambito: "cuentas-cobro.enviarEmail",
      ref: "ab12cd34",
      mensaje: "error-controlado",
      datos: { cuentaId: "3", status: 400 },
    });
  });
});

describe("crearRef", () => {
  it("genera refs cortas y distintas", () => {
    const primera = crearRef();
    const segunda = crearRef();
    expect(primera).toHaveLength(8);
    expect(primera).not.toBe(segunda);
  });
});

describe("conRegistro", () => {
  it("devuelve el resultado de la acción y registra su duración", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const resultado = await conRegistro("test.accion", { id: "1" }, async () => ({ ok: true }));

    expect(resultado).toEqual({ ok: true });
    const lineas = log.mock.calls.map((c) => JSON.parse(String(c[0])));
    expect(lineas.map((l) => l.mensaje)).toEqual(["inicio", "ok"]);
    expect(lineas[1].datos).toMatchObject({ id: "1" });
    log.mockRestore();
  });

  it("registra un error controlado como warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const resultado = await conRegistro("test.accion", {}, async () => ({
      ok: false,
      error: "Cuenta no encontrada.",
    }));

    expect(resultado).toEqual({ ok: false, error: "Cuenta no encontrada." });
    const linea = JSON.parse(String(warn.mock.calls.at(-1)?.[0]));
    expect(linea).toMatchObject({ nivel: "warn", mensaje: "error-controlado" });
    expect(linea.datos).toMatchObject({ error: "Cuenta no encontrada." });
    warn.mockRestore();
  });

  it("convierte una excepción en un resultado serializable con ref", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    const resultado = await conRegistro<{ ok: boolean; error?: string }>(
      "test.accion",
      { id: "7" },
      async () => {
        throw new Error("boom");
      },
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/Error inesperado \(ref [a-z0-9]{8}\)/);
    const linea = JSON.parse(String(error.mock.calls.at(-1)?.[0]));
    expect(linea).toMatchObject({ nivel: "error", mensaje: "excepcion" });
    expect(linea.datos).toMatchObject({ id: "7", error: "boom" });
    error.mockRestore();
    vi.restoreAllMocks();
  });
});
