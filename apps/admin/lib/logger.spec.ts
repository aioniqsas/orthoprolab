import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { conRegistro, crearRef, formatearLinea, persistirLinea } from "./logger";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "logs-admin-"));
  process.env.LOG_DIR = dir;
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("persistirLinea", () => {
  it("anexa al archivo en vez de sobrescribirlo", () => {
    const destino = mkdtempSync(join(tmpdir(), "logs-append-"));

    persistirLinea('{"n":1}', { dir: destino });
    persistirLinea('{"n":2}', { dir: destino });

    expect(readFileSync(join(destino, "admin.log"), "utf8")).toBe('{"n":1}\n{"n":2}\n');
  });

  it("rota al pasar el límite y conserva como máximo cinco archivos", () => {
    const destino = mkdtempSync(join(tmpdir(), "logs-rotate-"));
    // Nueve rotaciones: seis deben quedar borradas por la poda.
    for (let i = 0; i < 9; i += 1) {
      writeFileSync(join(destino, "admin.log"), "x".repeat(10));
      persistirLinea(`{"n":${i}}`, { dir: destino, limiteBytes: 5 });
    }

    const rotados = readdirSync(destino).filter((n) => n.startsWith("admin-"));
    expect(rotados.length).toBeLessThanOrEqual(5);
    // El archivo vivo arranca vacío tras cada rotación, no acumula.
    expect(readFileSync(join(destino, "admin.log"), "utf8")).toBe('{"n":8}\n');
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
  });

  it("deja el evento en disco aunque la terminal falle", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("stdout cerrado");
    });

    await expect(
      conRegistro("test.persistencia", { id: "9" }, async () => ({ ok: true })),
    ).resolves.toEqual({ ok: true });

    const contenido = readFileSync(join(dir, "admin.log"), "utf8");
    expect(contenido).toContain('"ambito":"test.persistencia"');
  });
});
