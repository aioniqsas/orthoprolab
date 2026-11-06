import { describe, expect, it } from "vitest";
import type { GrupoCuenta } from "./estados";
import {
  GRUPO_CUENTA_LABELS,
  GRUPOS_CUENTA,
  GRUPOS_ORDEN,
  grupoDeCuenta,
  grupoDeEstado,
} from "./estados";

describe("grupoDeEstado", () => {
  it("agrupa los siete estados del catálogo en activas, terminadas o canceladas", () => {
    expect(grupoDeEstado("creada")).toBe("activas");
    expect(grupoDeEstado("recibida")).toBe("activas");
    expect(grupoDeEstado("en_proceso")).toBe("activas");
    expect(grupoDeEstado("en_entrega")).toBe("activas");
    expect(grupoDeEstado("devuelta_correccion")).toBe("activas");
    expect(grupoDeEstado("terminada")).toBe("terminadas");
    expect(grupoDeEstado("cancelada")).toBe("canceladas");
  });

  it("no reparte ningún estado en dos grupos", () => {
    const vistos = Object.values(GRUPOS_ORDEN).flat();
    expect(new Set(vistos).size).toBe(vistos.length);
    expect(vistos).toHaveLength(7);
  });

  it("devuelve null para un estado desconocido o ausente", () => {
    expect(grupoDeEstado("en_produccion")).toBeNull();
    expect(grupoDeEstado("")).toBeNull();
    expect(grupoDeEstado(null)).toBeNull();
    expect(grupoDeEstado(undefined)).toBeNull();
  });
});

describe("grupoDeCuenta", () => {
  it("agrupa los cinco estados en pendientes, pagadas o canceladas", () => {
    expect(grupoDeCuenta("borrador")).toBe("pendientes");
    expect(grupoDeCuenta("emitida")).toBe("pendientes");
    expect(grupoDeCuenta("pagada_parcial")).toBe("pendientes");
    expect(grupoDeCuenta("pagada")).toBe("pagadas");
    expect(grupoDeCuenta("anulada")).toBe("canceladas");
  });

  it("devuelve null con un estado desconocido o vacío", () => {
    expect(grupoDeCuenta("inventado")).toBeNull();
    expect(grupoDeCuenta(null)).toBeNull();
    expect(grupoDeCuenta(undefined)).toBeNull();
  });

  it("cubre todos los grupos con etiqueta visible", () => {
    for (const grupo of Object.keys(GRUPOS_CUENTA) as GrupoCuenta[]) {
      expect(GRUPO_CUENTA_LABELS[grupo]).toMatch(/^[A-ZÁÉÍÓÚ]/);
    }
  });
});
