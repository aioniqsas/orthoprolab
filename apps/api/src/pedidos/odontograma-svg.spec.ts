import { describe, expect, it } from "vitest";
import { odontogramaSvg } from "./odontograma-svg.js";

const svgDe = (dientes: number[]) => odontogramaSvg({ dientes });

describe("odontogramaSvg", () => {
  it("dibuja los 32 dientes con su numeración FDI", () => {
    const svg = svgDe([]);
    const numeros = [...svg.matchAll(/>(\d\d)</g)].map((m) => m[1]);
    expect(numeros).toHaveLength(32);
    for (const numero of ["11", "18", "21", "28", "31", "38", "41", "48"]) {
      expect(numeros).toContain(numero);
    }
  });

  it("resalta solo los dientes de la orden", () => {
    const svg = svgDe([11, 46]);
    expect(svg).toContain('fill="#2563eb"');
    // Un diente sin marcar se queda en blanco.
    expect(svg).toContain('fill="#ffffff"');
    const resaltados = svg.match(/fill="#2563eb"/g) ?? [];
    expect(resaltados).toHaveLength(2);
  });

  it("acepta un color de resaltado propio", () => {
    const svg = odontogramaSvg({ dientes: [21], resaltado: "#db2777" });
    expect(svg.match(/fill="#db2777"/g)).toHaveLength(1);
  });

  it("produce un SVG autocontenido y estable", () => {
    const svg = svgDe([11]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    // Determinista: dos llamadas iguales producen el mismo documento.
    expect(svgDe([11])).toBe(svg);
  });
});

describe("odontogramaSvg · geometría de las arcadas", () => {
  /** Posiciones Y de los rects, en el orden en que se emiten. */
  const posicionesY = (svg: string) =>
    [...svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)"/g)].map((m) => Number(m[1]));

  it("deja los incisivos superiores por encima de los inferiores", () => {
    const y = posicionesY(svgDe([]));
    // ARCO_SUPERIOR y ARCO_INFERIOR empiezan en 18 / 48; el índice 7 es 11 / 41.
    expect(y).toHaveLength(32);
    expect(y[7]!).toBeLessThan(y[23]!);
  });

  it("no superpone las dos arcadas", () => {
    const y = posicionesY(svgDe([]));
    const superiores = y.slice(0, 16);
    const inferiores = y.slice(16);
    // El diente superior más bajo queda por encima del inferior más alto.
    expect(Math.max(...superiores)).toBeLessThan(Math.min(...inferiores));
  });
});
