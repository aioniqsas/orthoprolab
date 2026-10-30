import { describe, expect, it } from "vitest";
import { parseDientes } from "./dientes";

describe("parseDientes", () => {
  it("accepts a valid selection", () => {
    const result = parseDientes(
      JSON.stringify([
        { numero: 11, color: "A2" },
        { numero: 21, color: "B1" },
      ]),
    );
    expect(result).toEqual({
      ok: true,
      dientes: [
        { numero: 11, color: "A2" },
        { numero: 21, color: "B1" },
      ],
    });
  });

  it("trims colours", () => {
    const result = parseDientes(JSON.stringify([{ numero: 11, color: "  A2  " }]));
    expect(result).toEqual({ ok: true, dientes: [{ numero: 11, color: "A2" }] });
  });

  it("rejects a missing or empty selection", () => {
    expect(parseDientes(null).ok).toBe(false);
    expect(parseDientes("").ok).toBe(false);
    expect(parseDientes("[]").ok).toBe(false);
    expect(parseDientes("not json").ok).toBe(false);
  });

  it("rejects teeth outside the FDI permanent range", () => {
    for (const numero of [0, 19, 29, 30, 39, 40, 49, 55, 11.5]) {
      expect(parseDientes(JSON.stringify([{ numero, color: "A2" }])).ok).toBe(false);
    }
  });

  it("rejects duplicate teeth", () => {
    const raw = JSON.stringify([
      { numero: 11, color: "A2" },
      { numero: 11, color: "A3" },
    ]);
    expect(parseDientes(raw).ok).toBe(false);
  });

  it("rejects a missing or oversized colour", () => {
    expect(parseDientes(JSON.stringify([{ numero: 11, color: "" }])).ok).toBe(false);
    expect(parseDientes(JSON.stringify([{ numero: 11, color: "   " }])).ok).toBe(false);
    expect(parseDientes(JSON.stringify([{ numero: 11, color: "A".repeat(21) }])).ok).toBe(
      false,
    );
    expect(parseDientes(JSON.stringify([{ numero: 11 }])).ok).toBe(false);
  });
});
