"use client";

import { ARCO_INFERIOR, ARCO_SUPERIOR, COLOR_MAX_LENGTH } from "@repo/api-client";

interface Props {
  idPrefix?: string;
  dientes: number[];
  color?: string;
  onDientesChange?: (dientes: number[]) => void;
  onColorChange?: (color: string) => void;
  readOnly?: boolean;
}

/** Proportions of a dental arch inside the box that holds it. */
const ASPECTO = 1.9;
const RADIO_X = 38;
const RADIO_Y = 74;
const CENTRO_X = 50;
const CENTRO_Y_SUPERIOR = 84;
const CENTRO_Y_INFERIOR = 16;
/** How far outside the arch the FDI number sits. */
const MARGEN_ETIQUETA = 9;
const PASOS_ARCO = 200;

/** Relative width of each tooth type (1 = incisor … 8 = third molar). */
const ANCHO_RELATIVO = [0.62, 0.62, 0.72, 0.88, 0.88, 1.05, 1.05, 1.05];

const anchoDe = (numero: number) => ANCHO_RELATIVO[(numero % 10) - 1]!;

/** Cumulative arc length of the half-ellipse, in width units. Built once. */
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

/** Arc length that one unit of tooth width occupies on this arch. */
const UNIDAD = ARCO.total / ARCO_SUPERIOR.reduce((suma, n) => suma + anchoDe(n), 0);

/** Fractions of the arch where each tooth starts; teeth are laid out edge to edge. */
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

/** Parametric angle of the half-ellipse at a fraction of its arc length. */
function anguloEn(fraccion: number): number {
  const objetivo = ARCO.total * Math.min(Math.max(fraccion, 0), 1);
  let paso = 1;
  while (paso < PASOS_ARCO && ARCO.acumulado[paso]! < objetivo) paso++;
  const desde = ARCO.acumulado[paso - 1]!;
  const hasta = ARCO.acumulado[paso]!;
  const dentro = hasta > desde ? (objetivo - desde) / (hasta - desde) : 0;
  return Math.PI - (Math.PI * (paso - 1 + dentro)) / PASOS_ARCO;
}

/** Fraction of the arch at the centre of tooth `indice`. */
function fraccionDe(indice: number): number {
  const inicio = INICIOS[indice] ?? 0;
  const fin = INICIOS[indice + 1] ?? 1;
  return (inicio + fin) / 2;
}

/** Half-ellipse closed by the bite line: the mouth floor the arch surrounds. */
function paladar(esInferior: boolean): string {
  const centroY = esInferior ? CENTRO_Y_INFERIOR : CENTRO_Y_SUPERIOR;
  const barrido = esInferior ? 0 : 1;
  const izquierda = CENTRO_X - RADIO_X + 6;
  const derecha = CENTRO_X + RADIO_X - 6;
  return `M ${izquierda} ${centroY} A ${RADIO_X - 6} ${RADIO_Y - 6} 0 0 ${barrido} ${derecha} ${centroY} Z`;
}

export interface PuntoArco {
  left: string;
  top: string;
}

function punto(fraccion: number, radioExtra: number, esInferior: boolean): PuntoArco {
  const angulo = anguloEn(fraccion);
  const centroY = esInferior ? CENTRO_Y_INFERIOR : CENTRO_Y_SUPERIOR;
  const sentido = esInferior ? 1 : -1;
  const left = CENTRO_X + (RADIO_X + radioExtra) * Math.cos(angulo);
  const top = centroY + sentido * (RADIO_Y + radioExtra) * Math.sin(angulo);
  return {
    left: `${left.toFixed(6)}%`,
    top: `${top.toFixed(6)}%`,
  };
}

/** Centre of the tooth, on the arch. */
export const posicionEnArco = (indice: number, esInferior: boolean) =>
  punto(fraccionDe(indice), 0, esInferior);

/** Where the FDI number goes: just outside the arch. */
export const posicionEtiqueta = (indice: number, esInferior: boolean) =>
  punto(fraccionDe(indice), MARGEN_ETIQUETA, esInferior);

/** Width of the tooth as a percentage of the arch width. */
export const anchoDiente = (numero: number) => anchoDe(numero) * UNIDAD;

/** Turns the tooth so its crown points at the centre of the mouth. */
export function rotacionDiente(indice: number, esInferior: boolean): number {
  const { left, top } = posicionEnArco(indice, esInferior);
  const x = Number.parseFloat(left);
  const y = Number.parseFloat(top);
  const centroY = esInferior ? CENTRO_Y_INFERIOR : CENTRO_Y_SUPERIOR;
  const rot = (Math.atan2(y - centroY, x - CENTRO_X) * 180) / Math.PI + 90;
  return Number(rot.toFixed(6));
}

/** Crown outline, root up and occlusal edge down. */
function Corona({ numero }: { numero: number }) {
  const tipo = numero % 10;
  if (tipo <= 2) {
    return <path d="M9 2h6l2.5 17c-2 2-9 2-11 0L9 2Z" strokeLinejoin="round" />;
  }
  if (tipo === 3) {
    return <path d="M9 2h6l3 13-6 8-6-8 3-13Z" strokeLinejoin="round" />;
  }
  if (tipo <= 5) {
    return <path d="M9 2h6c3 5 3.5 12 2.5 18-2.5 2-8.5 2-11 0C5.5 14 6 7 9 2Z" strokeLinejoin="round" />;
  }
  return <path d="M7 2h10c3 5 3 12 2 18-4 2.5-10 2.5-14 0-1-6-1-13 2-18Z" strokeLinejoin="round" />;
}

/** Fissures: what makes a molar read as a molar at 20px. */
function Fisure({ numero }: { numero: number }) {
  const tipo = numero % 10;
  if (tipo <= 2) return <path d="M10 19h4" />;
  if (tipo === 3) return <path d="M12 12v6" />;
  if (tipo <= 5) return <path d="M12 11v5m0 0-3 4m3-4 3 4" />;
  return <path d="M12 10v6m0 0-3.5 4M12 16l3.5 4M8 13h8" />;
}

function FormaDiente({ numero, activo }: { numero: number; activo: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`h-full w-full ${
        activo ? "fill-primary stroke-primary-foreground" : "fill-none stroke-body/50"
      }`}
      strokeWidth={1.6}
    >
      <Corona numero={numero} />
      <Fisure numero={numero} />
    </svg>
  );
}

export function Odontograma({
  idPrefix = "odontograma",
  dientes = [],
  color = "",
  onDientesChange,
  onColorChange,
  readOnly = false,
}: Props) {
  const seleccionado = new Set(dientes);

  function toggle(numero: number) {
    if (readOnly || !onDientesChange) return;
    onDientesChange(
      seleccionado.has(numero)
        ? dientes.filter((diente) => diente !== numero)
        : [...dientes, numero],
    );
  }

  const arco = (numeros: readonly number[], etiqueta: string, esInferior: boolean) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{etiqueta}</span>
      <div className="relative w-full" style={{ aspectRatio: ASPECTO }}>
        {/* Palate (upper) / floor of the mouth (lower): the area the arch encloses. */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={paladar(esInferior)} className="fill-body/10 stroke-body/15" strokeWidth={0.6} />
        </svg>

        {numeros.map((numero, indice) => {
          const activo = seleccionado.has(numero);
          const pos = posicionEnArco(indice, esInferior);
          const style = {
            left: pos.left,
            top: pos.top,
            width: `${anchoDiente(numero)}%`,
            transform: `translate(-50%, -50%) rotate(${rotacionDiente(indice, esInferior)}deg)`,
          };

          if (readOnly) {
            return (
              <div key={`${numero}-tooth`} style={style} className="absolute aspect-square pointer-events-none">
                <FormaDiente numero={numero} activo={activo} />
              </div>
            );
          }

          return (
            <button
              key={`${numero}-tooth`}
              type="button"
              aria-pressed={activo}
              aria-label={`Diente ${numero}`}
              title={`Diente ${numero}`}
              onClick={() => toggle(numero)}
              style={style}
              className="absolute aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
            >
              <FormaDiente numero={numero} activo={activo} />
            </button>
          );
        })}

        {numeros.map((numero, indice) => {
          const lab = posicionEtiqueta(indice, esInferior);
          return (
            <span
              key={`${numero}-label`}
              aria-hidden
              style={{ left: lab.left, top: lab.top }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[9px] font-medium tabular-nums text-muted-foreground"
            >
              {numero}
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-3">
        {arco(ARCO_SUPERIOR, "Superior", false)}
        {arco(ARCO_INFERIOR, "Inferior", true)}
      </div>

      {readOnly ? (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {color ? <p>Color de diente: {color}</p> : null}
          <p>
            {dientes.length === 0
              ? "Sin dientes seleccionados."
              : `Dientes: ${[...dientes].sort((a, b) => a - b).join(", ")}`}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor={`${idPrefix}_color`} className="shrink-0 text-xs font-medium text-body">
              Color de diente
            </label>
            <input
              id={`${idPrefix}_color`}
              value={color}
              maxLength={COLOR_MAX_LENGTH}
              placeholder="Ej. A2"
              onChange={(event) => onColorChange?.(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {dientes.length === 0
              ? "Selecciona los dientes sobre los que se realiza el trabajo."
              : `Dientes: ${[...dientes].sort((a, b) => a - b).join(", ")}`}
          </p>
        </>
      )}
    </div>
  );
}
