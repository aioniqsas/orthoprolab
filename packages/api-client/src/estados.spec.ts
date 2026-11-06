import { describe, expect, it } from "vitest";
import { GRUPOS_ORDEN, grupoDeEstado } from "./estados";

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
