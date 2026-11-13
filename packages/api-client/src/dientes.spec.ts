import { describe, expect, it } from "vitest";
import { esDienteValido, nombreDiente, parseColor, parseDientes, resumenDientes } from "./dientes";

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

describe("nombreDiente", () => {
  it("nombra la pieza con su tipo y su cuadrante", () => {
    expect(nombreDiente(14)).toBe("primer premolar superior derecho");
    expect(nombreDiente(11)).toBe("incisivo central superior derecho");
    expect(nombreDiente(23)).toBe("canino superior izquierdo");
    expect(nombreDiente(46)).toBe("primer molar inferior derecho");
    expect(nombreDiente(38)).toBe("tercer molar inferior izquierdo");
  });

  it("no revienta con un código inválido", () => {
    expect(nombreDiente(99)).toBe("diente 99");
  });
});

describe("resumenDientes", () => {
  it("devuelve el nombre completo cuando hay una sola pieza", () => {
    expect(resumenDientes([14])).toBe("primer premolar superior derecho");
    // Acepta duplicados sin repetir la pieza.
    expect(resumenDientes([14, 14])).toBe("primer premolar superior derecho");
  });

  it("agrupa por clase con singular y plural correctos", () => {
    expect(resumenDientes([14, 15, 24, 25, 26])).toBe("4 premolares y 1 molar");
    expect(resumenDientes([11, 21])).toBe("2 incisivos");
    expect(resumenDientes([13, 46])).toBe("1 canino y 1 molar");
  });

  it("ordena las clases de incisivo a molar", () => {
    expect(resumenDientes([46, 13, 11])).toBe("1 incisivo, 1 canino y 1 molar");
  });

  it("devuelve vacío sin piezas", () => {
    expect(resumenDientes([])).toBe("");
  });

  it("esDienteValido acepta la numeración FDI y rechaza lo demás", () => {
    expect(esDienteValido(26)).toBe(true);
    expect(esDienteValido(48)).toBe(true);
    expect(esDienteValido(99)).toBe(false);
    expect(esDienteValido(19)).toBe(false);
  });
});
