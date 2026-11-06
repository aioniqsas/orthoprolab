import { describe, expect, it } from "vitest";
import {
  diaNegocio,
  formatearFecha,
  formatearFechaHora,
  hoyNegocio,
  ZONA_NEGOCIO,
} from "./fechas";

describe("diaNegocio", () => {
  it("usa el día de Bogotá, no el de UTC", () => {
    // 02:00 UTC del 7 de noviembre son las 21:00 del 6 en Bogotá.
    expect(diaNegocio("2026-11-07T02:00:00.000Z")).toBe("2026-11-06");
    expect(diaNegocio(new Date("2026-11-07T02:00:00.000Z"))).toBe("2026-11-06");
  });

  it("no se mueve de día cuando UTC y Bogotá coinciden", () => {
    expect(diaNegocio("2026-11-06T12:00:00.000Z")).toBe("2026-11-06");
  });

  it("falla con una fecha ilegible", () => {
    expect(() => diaNegocio("no-es-fecha")).toThrow(RangeError);
  });
});

describe("hoyNegocio", () => {
  it("devuelve un día ISO de la zona del negocio", () => {
    expect(hoyNegocio()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ZONA_NEGOCIO).toBe("America/Bogota");
  });
});

describe("formatearFecha", () => {
  it("formatea el día del negocio, no el del proceso", () => {
    // 02:00 UTC del 7 de noviembre: en Bogotá todavía es 6.
    expect(formatearFecha("2026-11-07T02:00:00.000Z")).toBe("6 de noviembre de 2026");
  });

  it("devuelve el texto vacío configurable", () => {
    expect(formatearFecha(null)).toBe("Sin fecha");
    expect(formatearFecha(undefined)).toBe("Sin fecha");
    expect(formatearFecha(null, "—")).toBe("—");
    expect(formatearFecha("no-es-fecha")).toBe("Sin fecha");
  });
});

describe("formatearFechaHora", () => {
  it("muestra la hora de Bogotá", () => {
    // 17:19 UTC son las 12:19 en Bogotá.
    expect(formatearFechaHora("2026-11-06T17:19:00.000Z")).toContain("12:19");
    expect(formatearFechaHora("2026-11-06T17:19:00.000Z")).toContain("2026");
  });

  it("devuelve el texto vacío configurable", () => {
    expect(formatearFechaHora(null)).toBe("—");
    expect(formatearFechaHora("no-es-fecha")).toBe("—");
  });
});
