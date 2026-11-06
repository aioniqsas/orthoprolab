// Réplica del odontograma de las órdenes (packages/ui/src/components/odontograma.tsx)
// como SVG plano para el PDF: mismas coronas por tipo de diente, fisuras, arco,
// paladar, rotación y numeración FDI. Los colores se ajustan al papel blanco.

/** Mismos arcos y orden FDI que packages/api-client/src/dientes.ts. */
const ARCO_SUPERIOR = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const ARCO_INFERIOR = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

/** Proporciones de la caja que contiene cada arcada. */
const ASPECTO = 1.9;
const RADIO_X = 38;
const RADIO_Y = 74;
const CENTRO_X = 50;
const CENTRO_Y_SUPERIOR = 84;
const CENTRO_Y_INFERIOR = 16;
const MARGEN_ETIQUETA = 9;
const PASOS_ARCO = 200;

/** Ancho relativo de cada tipo de diente (1 = incisivo … 8 = tercer molar). */
const ANCHO_RELATIVO = [0.62, 0.62, 0.72, 0.88, 0.88, 1.05, 1.05, 1.05];

const anchoDe = (numero: number) => ANCHO_RELATIVO[(numero % 10) - 1]!;

/** Longitud de arco acumulada de la media elipse, en unidades de ancho. */
const ARCO = (() => {
  const punto = (t: number) => ({
    x: RADIO_X * Math.cos(t),
    y: (-RADIO_Y * Math.sin(t)) / ASPECTO,
  });
  const acumulado = [0];
  let anterior = punto(Math.PI);
  for (let i = 1; i <= PASOS_ARCO; i++) {
    const actual = punto(Math.PI - (Math.PI * i) / PASOS_ARCO);
    acumulado.push(acumulado[i - 1]! + Math.hypot(actual.x - anterior.x, actual.y - anterior.y));
    anterior = actual;
  }
  return { acumulado, total: acumulado[PASOS_ARCO]! };
})();

/** Longitud de arco que ocupa una unidad de ancho de diente. */
const UNIDAD = ARCO.total / ARCO_SUPERIOR.reduce((suma, n) => suma + anchoDe(n), 0);

/** Fracciones del arco donde empieza cada diente; van pegados. */
const INICIOS = (() => {
  const total = ARCO_SUPERIOR.reduce((suma, n) => suma + anchoDe(n), 0);
  const salida = [0];
  let acumulado = 0;
  for (let i = 0; i < ARCO_SUPERIOR.length - 1; i++) {
    acumulado += anchoDe(ARCO_SUPERIOR[i]!);
    salida.push(acumulado / total);
  }
  return salida;
})();

/** Ángulo paramétrico de la media elipse en una fracción de su longitud. */
function anguloEn(fraccion: number): number {
  const objetivo = ARCO.total * Math.min(Math.max(fraccion, 0), 1);
  let paso = 1;
  while (paso < PASOS_ARCO && ARCO.acumulado[paso]! < objetivo) paso++;
  const desde = ARCO.acumulado[paso - 1]!;
  const hasta = ARCO.acumulado[paso]!;
  const dentro = hasta > desde ? (objetivo - desde) / (hasta - desde) : 0;
  return Math.PI - (Math.PI * (paso - 1 + dentro)) / PASOS_ARCO;
}

const fraccionDe = (indice: number): number =>
  ((INICIOS[indice] ?? 0) + (INICIOS[indice + 1] ?? 1)) / 2;

interface Punto {
  left: number;
  top: number;
}

function punto(fraccion: number, radioExtra: number, esInferior: boolean): Punto {
  const angulo = anguloEn(fraccion);
  const centroY = esInferior ? CENTRO_Y_INFERIOR : CENTRO_Y_SUPERIOR;
  const sentido = esInferior ? 1 : -1;
  return {
    left: CENTRO_X + (RADIO_X + radioExtra) * Math.cos(angulo),
    top: centroY + sentido * (RADIO_Y + radioExtra) * Math.sin(angulo),
  };
}

const posicionEnArco = (indice: number, esInferior: boolean) =>
  punto(fraccionDe(indice), 0, esInferior);

const posicionEtiqueta = (indice: number, esInferior: boolean) =>
  punto(fraccionDe(indice), MARGEN_ETIQUETA, esInferior);

/** Ancho del diente como porcentaje del ancho del arco. */
const anchoDiente = (numero: number) => anchoDe(numero) * UNIDAD;

/** Gira el diente para que su corona apunte al centro de la boca. */
function rotacionDiente(indice: number, esInferior: boolean): number {
  const { left, top } = posicionEnArco(indice, esInferior);
  const centroY = esInferior ? CENTRO_Y_INFERIOR : CENTRO_Y_SUPERIOR;
  const rot = (Math.atan2(top - centroY, left - CENTRO_X) * 180) / Math.PI + 90;
  return Number(rot.toFixed(3));
}

/** Contorno de la corona; la raíz arriba y el borde oclusal abajo. */
function corona(numero: number): string {
  const tipo = numero % 10;
  if (tipo <= 2) return 'M9 2h6l2.5 17c-2 2-9 2-11 0L9 2Z';
  if (tipo === 3) return 'M9 2h6l3 13-6 8-6-8 3-13Z';
  if (tipo <= 5) return 'M9 2h6c3 5 3.5 12 2.5 18-2.5 2-8.5 2-11 0C5.5 14 6 7 9 2Z';
  return 'M7 2h10c3 5 3 12 2 18-4 2.5-10 2.5-14 0-1-6-1-13 2-18Z';
}

/** Fisuras: lo que hace que un molar se lea como molar. */
function fisura(numero: number): string {
  const tipo = numero % 10;
  if (tipo <= 2) return 'M10 19h4';
  if (tipo === 3) return 'M12 12v6';
  if (tipo <= 5) return 'M12 11v5m0 0-3 4m3-4 3 4';
  return 'M12 10v6m0 0-3.5 4M12 16l3.5 4M8 13h8';
}

export const ODONTOGRAMA_ANCHO = 500;
const MARGEN = 20;
const ANCHO_CAJA = ODONTOGRAMA_ANCHO - MARGEN * 2;
const ALTO_CAJA = ANCHO_CAJA / ASPECTO;
export const ODONTOGRAMA_ALTO = Math.round(34 + ALTO_CAJA * 2 + 14 + MARGEN);

const ACTIVO_RELLENO = '#48fbc1';
const ACTIVO_BORDE = '#171717';
const INACTIVO_BORDE = '#9aa4b2';
const PALADAR_RELLENO = '#f2f5f8';
const PALADAR_BORDE = '#dbe1e8';
const ETIQUETA = '#6b7280';

const n = (valor: number) => Number(valor.toFixed(2));

/** Área que encierra el arco, en coordenadas absolutas del lienzo. */
function paladar(y0: number, esInferior: boolean): string {
  const sx = (v: number) => n(MARGEN + ANCHO_CAJA * (v / 100));
  const sy = (v: number) => n(y0 + ALTO_CAJA * (v / 100));
  const izquierda = sx(CENTRO_X - RADIO_X + 6);
  const derecha = sx(CENTRO_X + RADIO_X - 6);
  const centroY = sy(esInferior ? CENTRO_Y_INFERIOR : CENTRO_Y_SUPERIOR);
  const rx = sx(RADIO_X - 6) - sx(0);
  const ry = n(ALTO_CAJA * ((RADIO_Y - 6) / 100));
  const barrido = esInferior ? 0 : 1;
  return `M ${izquierda} ${centroY} A ${rx} ${ry} 0 0 ${barrido} ${derecha} ${centroY} Z`;
}

export interface OdontogramaOpciones {
  /** Dientes FDI a resaltar. */
  dientes: number[];
  /** Color de resaltado de los dientes de la orden. */
  resaltado?: string;
}

/**
 * Figura del odontograma para el PDF. Misma geometría y formas que el
 * odontograma de las órdenes, con colores legibles sobre papel blanco.
 */
export function odontogramaSvg({ dientes, resaltado = ACTIVO_RELLENO }: OdontogramaOpciones): string {
  const marcados = new Set(dientes);

  const arco = (numeros: readonly number[], y0: number, esInferior: boolean) => {
    const piezas = numeros
      .map((numero, indice) => {
        const activo = marcados.has(numero);
        const { left, top } = posicionEnArco(indice, esInferior);
        const x = n(MARGEN + ANCHO_CAJA * (left / 100));
        const y = n(y0 + ALTO_CAJA * (top / 100));
        const tamano = n((ANCHO_CAJA * anchoDiente(numero)) / 100);
        const giro = rotacionDiente(indice, esInferior);
        const relleno = activo ? resaltado : '#ffffff';
        const borde = activo ? ACTIVO_BORDE : INACTIVO_BORDE;
        return [
          `<g transform="translate(${x} ${y}) rotate(${giro})">`,
          `<g transform="translate(${n(-tamano / 2)} ${n(-tamano / 2)}) scale(${n(tamano / 24)})">`,
          `<path d="${corona(numero)}" fill="${relleno}" stroke="${borde}" stroke-width="1.6" stroke-linejoin="round"/>`,
          `<path d="${fisura(numero)}" fill="none" stroke="${borde}" stroke-width="1.6" stroke-linecap="round"/>`,
          `</g></g>`,
        ].join('');
      })
      .join('');

    const etiquetas = numeros
      .map((numero, indice) => {
        const { left, top } = posicionEtiqueta(indice, esInferior);
        const x = n(MARGEN + ANCHO_CAJA * (left / 100));
        const y = n(y0 + ALTO_CAJA * (top / 100) + 4);
        return `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="12" text-anchor="middle" fill="${ETIQUETA}">${numero}</text>`;
      })
      .join('');

    return [
      `<path d="${paladar(y0, esInferior)}" fill="${PALADAR_RELLENO}" stroke="${PALADAR_BORDE}" stroke-width="0.8"/>`,
      piezas,
      etiquetas,
    ].join('');
  };

  const ySuperior = 34;
  const yInferior = n(ySuperior + ALTO_CAJA + 14);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ODONTOGRAMA_ANCHO}" height="${ODONTOGRAMA_ALTO}" viewBox="0 0 ${ODONTOGRAMA_ANCHO} ${ODONTOGRAMA_ALTO}">`,
    `<rect width="${ODONTOGRAMA_ANCHO}" height="${ODONTOGRAMA_ALTO}" fill="#ffffff"/>`,
    `<text x="${MARGEN}" y="22" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">Odontograma</text>`,
    // Superior: numeración por fuera del arco (arriba).
    arco(ARCO_SUPERIOR, ySuperior, false),
    // Inferior: numeración por debajo.
    arco(ARCO_INFERIOR, yInferior, true),
    `</svg>`,
  ].join('');
}
