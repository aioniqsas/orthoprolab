// Mismos arcos y orden FDI que packages/api-client/src/dientes.ts; el API no
// depende de ese paquete (ver odd/tasks/control-trabajos-odontograma.md).
const ARCO_SUPERIOR = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const ARCO_INFERIOR = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

/** Ancho relativo de cada tipo de diente (1 = incisivo … 8 = tercer molar). */
const ANCHO_RELATIVO = [0.62, 0.62, 0.72, 0.88, 0.88, 1.05, 1.05, 1.05];

const CENTRO_X = 300;
/** Línea de mordida: los molares de ambas arcadas se apoyan aquí. */
const CENTRO_Y = 210;
const RADIO_X = 235;
const RADIO_Y = 118;
const ALTO_DIENTE = 30;
const ANCHO_DIENTE = 20;

export interface OdontogramaOpciones {
  /** Dientes FDI a resaltar. */
  dientes: number[];
  /** Color de resaltado (por defecto, el azul de marca). */
  resaltado?: string;
}

interface Colocado {
  numero: number;
  x: number;
  y: number;
}

/** Reparte los dientes de un arco, de izquierda a derecha, sobre la elipse. */
function colocarArco(
  arco: readonly number[],
  centroY: number,
  sentido: 1 | -1,
): Colocado[] {
  const total = arco.reduce((suma, n) => suma + ANCHO_RELATIVO[(n % 10) - 1]!, 0);
  let acumulado = 0;

  return arco.map((numero) => {
    const ancho = ANCHO_RELATIVO[(numero % 10) - 1]!;
    const fraccion = (acumulado + ancho / 2) / total;
    acumulado += ancho;
    const angulo = Math.PI - Math.PI * fraccion;
    return {
      numero,
      x: CENTRO_X + RADIO_X * Math.cos(angulo),
      y: centroY + sentido * RADIO_Y * Math.sin(angulo),
    };
  });
}

const n = (valor: number) => valor.toFixed(1);

/**
 * Figura del odontograma para documentos: dientes en dos arcos, numeración FDI
 * y los dientes de la orden resaltados. SVG plano, sin dependencias.
 */
export function odontogramaSvg({ dientes, resaltado = "#2563eb" }: OdontogramaOpciones): string {
  const marcados = new Set(dientes);

  const arco = (colocados: Colocado[], etiquetaAbajo: boolean) =>
    colocados
      .map(({ numero, x, y }) => {
        const activo = marcados.has(numero);
        const relleno = activo ? resaltado : "#ffffff";
        const borde = activo ? resaltado : "#cbd5e1";
        const etiquetaY = etiquetaAbajo ? y + ALTO_DIENTE / 2 + 14 : y - ALTO_DIENTE / 2 - 6;
        return [
          `<rect x="${n(x - ANCHO_DIENTE / 2)}" y="${n(y - ALTO_DIENTE / 2)}" width="${ANCHO_DIENTE}" height="${ALTO_DIENTE}" rx="6" fill="${relleno}" stroke="${borde}" stroke-width="1.5"/>`,
          `<text x="${n(x)}" y="${n(etiquetaY)}" font-family="Helvetica, Arial, sans-serif" font-size="11" text-anchor="middle" fill="#475569">${numero}</text>`,
        ].join("");
      })
      .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">`,
    `<rect width="600" height="420" fill="#ffffff"/>`,
    `<text x="${CENTRO_X}" y="24" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">Odontograma</text>`,
    // Superior: la numeración queda por fuera del arco (arriba).
    arco(colocarArco(ARCO_SUPERIOR, CENTRO_Y, -1), false),
    // Inferior: la numeración queda por debajo.
    arco(colocarArco(ARCO_INFERIOR, CENTRO_Y, 1), true),
    `</svg>`,
  ].join("");
}
