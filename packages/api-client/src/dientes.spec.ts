import { describe, expect, it } from "vitest";
import { parseColor, parseDientes } from "./dientes";

describe("parseDientes", () => {
  it("accepts a valid selection", () => {
    expect(parseDientes(JSON.stringify([11, 21]))).toEqual({
      ok: true,
      dientes: [11, 21],
    });
  });

  it("accepts an already parsed array", () => {
    expect(parseDientes([11])).toEqual({ ok: true, dientes: [11] });
  });

  it("rejects a missing or empty selection", () => {
    expect(parseDientes(null).ok).toBe(false);
    expect(parseDientes("").ok).toBe(false);
    expect(parseDientes("[]").ok).toBe(false);
    expect(parseDientes("not json").ok).toBe(false);
  });

  it("rejects teeth outside the FDI permanent range", () => {
    for (const numero of [0, 19, 29, 30, 39, 40, 49, 55, 11.5]) {
      expect(parseDientes(JSON.stringify([numero])).ok).toBe(false);
    }
  });

  it("rejects duplicate teeth", () => {
    expect(parseDientes(JSON.stringify([11, 11])).ok).toBe(false);
  });
});

describe("parseColor", () => {
  it("trims the shade", () => {
    expect(parseColor("  A2  ")).toEqual({ ok: true, color: "A2" });
  });

  it("rejects a blank or oversized shade", () => {
    expect(parseColor("").ok).toBe(false);
    expect(parseColor("   ").ok).toBe(false);
    expect(parseColor(null).ok).toBe(false);
    expect(parseColor("A".repeat(21)).ok).toBe(false);
  });
});
