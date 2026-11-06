import { describe, expect, it } from "vitest";
import { odontogramaSvg, ODONTOGRAMA_ALTO, ODONTOGRAMA_ANCHO } from "./odontograma-svg.js";

const svgDe = (dientes: number[]) => odontogramaSvg({ dientes });

/** Centros Y de cada diente, en el orden en que se emiten (superior, luego inferior). */
const centrosY = (svg: string) =>
  [...svg.matchAll(/<g transform="translate\([\d.]+ ([\d.]+)\) rotate/g)].map((m) => Number(m[1]));

describe("odontogramaSvg · contenido", () => {
  it("dibuja las dos arcadas con la numeración FDI", () => {
    const svg = svgDe([]);
    const etiquetas = [...svg.matchAll(/>(\d\d)<\/text>/g)].map((m) => m[1]);
    expect(etiquetas).toHaveLength(32);
    for (const numero of ["11", "18", "21", "28", "31", "38", "41", "48"]) {
      expect(etiquetas).toContain(numero);
    }
  });

  it("usa una corona y una fisura por diente", () => {
    const svg = svgDe([]);
    // Un grupo rotado por diente: la arcada se dibuja sobre la media elipse.
    expect(svg.match(/rotate\(/g)).toHaveLength(32);
    // Corona (linejoin) y fisura (linecap) por diente; el paladar no las lleva.
    expect(svg.match(/stroke-linejoin="round"/g)).toHaveLength(32);
    expect(svg.match(/stroke-linecap="round"/g)).toHaveLength(32);
  });

  it("resalta solo los dientes de la orden", () => {
    const svg = svgDe([11, 46]);
    expect(svg.match(/fill="#48fbc1"/g) ?? []).toHaveLength(2);
    // El resto de coronas se queda en blanco (el fondo es un rect, no un path).
    expect(svg.match(/fill="#ffffff" stroke=/g) ?? []).toHaveLength(30);
  });

  it("acepta un color de resaltado propio", () => {
    const svg = odontogramaSvg({ dientes: [21], resaltado: "#db2777" });
    expect(svg.match(/fill="#db2777"/g) ?? []).toHaveLength(1);
  });
});

describe("odontogramaSvg · geometría de las arcadas", () => {
  it("no superpone las dos arcadas", () => {
    const y = centrosY(svgDe([]));
    expect(y).toHaveLength(32);
    expect(Math.max(...y.slice(0, 16))).toBeLessThan(Math.min(...y.slice(16)));
  });

  it("pone la numeración del arco superior arriba y la del inferior abajo", () => {
    const svg = svgDe([]);
    const textos = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*>(\d\d)</g)];
    const posiciones = textos.map((m) => ({ y: Number(m[1]), numero: m[2]! }));
    const superior = posiciones.find((p) => p.numero === "11")!;
    const inferior = posiciones.find((p) => p.numero === "41")!;
    expect(superior.y).toBeLessThan(inferior.y);
  });

  it("produce un SVG autocontenido, determinista y de tamaño fijo", () => {
    const svg = svgDe([11]);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${ODONTOGRAMA_ANCHO} ${ODONTOGRAMA_ALTO}"`);
    expect(svgDe([11])).toBe(svg);
  });
});
