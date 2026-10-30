import { describe, expect, it } from "vitest";
import { posicionEnArco } from "./odontograma";

const pct = (valor: string) => Number.parseFloat(valor);

describe("posicionEnArco", () => {
  it("mirrors the two ends of the arch", () => {
    const primero = posicionEnArco(0, 16, false);
    const ultimo = posicionEnArco(15, 16, false);
    expect(pct(primero.left)).toBeCloseTo(100 - pct(ultimo.left));
    expect(pct(primero.top)).toBeCloseTo(pct(ultimo.top));
  });

  it("keeps every tooth inside the drawing", () => {
    for (let i = 0; i < 16; i++) {
      for (const esInferior of [false, true]) {
        const { left, top } = posicionEnArco(i, 16, esInferior);
        expect(pct(left)).toBeGreaterThanOrEqual(6);
        expect(pct(left)).toBeLessThanOrEqual(94);
        expect(pct(top)).toBeGreaterThanOrEqual(12);
        expect(pct(top)).toBeLessThanOrEqual(88);
      }
    }
  });

  it("opens the upper arch upward and the lower one downward", () => {
    const centroSuperior = pct(posicionEnArco(7, 16, false).top);
    const bordeSuperior = pct(posicionEnArco(0, 16, false).top);
    expect(centroSuperior).toBeLessThan(bordeSuperior);

    const centroInferior = pct(posicionEnArco(7, 16, true).top);
    const bordeInferior = pct(posicionEnArco(0, 16, true).top);
    expect(centroInferior).toBeGreaterThan(bordeInferior);
  });
});
