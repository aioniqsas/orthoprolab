import { describe, expect, it } from "vitest";
import {
  anchoDiente,
  posicionEnArco,
  posicionEtiqueta,
  rotacionDiente,
} from "./odontograma";

const pct = (valor: string) => Number.parseFloat(valor);

describe("geometría del molde", () => {
  it("coloca los dientes en arco, de un extremo al otro", () => {
    const primero = posicionEnArco(0, false);
    const ultimo = posicionEnArco(15, false);
    expect(pct(primero.left)).toBeCloseTo(100 - pct(ultimo.left));
    expect(pct(primero.top)).toBeCloseTo(pct(ultimo.top));
  });

  it("abre el arco superior hacia arriba y el inferior hacia abajo", () => {
    const centroSuperior = pct(posicionEnArco(7, false).top);
    const bordeSuperior = pct(posicionEnArco(0, false).top);
    expect(centroSuperior).toBeLessThan(bordeSuperior);

    const centroInferior = pct(posicionEnArco(7, true).top);
    const bordeInferior = pct(posicionEnArco(0, true).top);
    expect(centroInferior).toBeGreaterThan(bordeInferior);
  });

  it("deja la numeración fuera del arco", () => {
    for (const indice of [0, 4, 7, 12, 15]) {
      for (const esInferior of [false, true]) {
        const diente = posicionEnArco(indice, esInferior);
        const etiqueta = posicionEtiqueta(indice, esInferior);
        const distanciaDiente = Math.hypot(pct(diente.left) - 50, (pct(diente.top) - 84) * 0.5);
        const distanciaEtiqueta = Math.hypot(
          pct(etiqueta.left) - 50,
          (pct(etiqueta.top) - 84) * 0.5,
        );
        expect(distanciaEtiqueta).toBeGreaterThan(distanciaDiente);
      }
    }
  });

  it("hace los molares más anchos que los incisivos", () => {
    expect(anchoDiente(17)).toBeGreaterThan(anchoDiente(14));
    expect(anchoDiente(14)).toBeGreaterThan(anchoDiente(12));
  });

  it("gira cada diente hacia el centro de la boca", () => {
    // Los incisivos centrales quedan casi verticales y los molares de costado.
    expect(Math.abs(rotacionDiente(7, false))).toBeLessThan(6);
    expect(Math.abs(rotacionDiente(0, false))).toBeGreaterThan(70);
    // El arco inferior es el espejo: el central mira hacia arriba (media vuelta).
    expect(Math.abs(rotacionDiente(7, true))).toBeGreaterThan(170);
  });
});
