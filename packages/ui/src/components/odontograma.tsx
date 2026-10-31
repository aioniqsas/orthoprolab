"use client";

import { ARCO_INFERIOR, ARCO_SUPERIOR, COLOR_MAX_LENGTH } from "@repo/api-client";

interface Props {
  idPrefix: string;
  dientes: number[];
  color: string;
  onDientesChange: (dientes: number[]) => void;
  onColorChange: (color: string) => void;
}

/** Width / height of each arch box, matching the `aspect-[2.4/1]` container. */
const ASPECTO_ARCO = 2.4;
const RADIO_X = 44;
const RADIO_Y = 76;
/** Steps used to measure the arc; enough for sub-pixel accuracy. */
const PASOS_ARCO = 200;

/** Cumulative arc length of the half-ellipse, measured in width units so both
 *  axes share one scale. Built once: it never changes. */
const ARCO = (() => {
  const punto = (t: number) => ({
    x: RADIO_X * Math.cos(t),
    y: (-RADIO_Y * Math.sin(t)) / ASPECTO_ARCO,
  });
  const acumulado = [0];
  let anterior = punto(Math.PI);
  for (let i = 1; i <= PASOS_ARCO; i++) {
    const actual = punto(Math.PI - (Math.PI * i) / PASOS_ARCO);
    acumulado.push(
      acumulado[i - 1]! +
        Math.hypot(actual.x - anterior.x, actual.y - anterior.y),
    );
    anterior = actual;
  }
  return { acumulado, total: acumulado[PASOS_ARCO]! };
})();

/**
 * Places tooth `indice` on a half-ellipse, the way a dental mould is drawn:
 * the upper arch opens downward (∩) and the lower one upward (∪). Teeth are
 * spread by arc length, not by angle, so they are evenly spaced and the arch
 * does not bunch up at its ends.
 */
export function posicionEnArco(indice: number, total: number, esInferior: boolean) {
  const objetivo = (ARCO.total * indice) / (total - 1);
  let paso = 1;
  while (paso < PASOS_ARCO && ARCO.acumulado[paso]! < objetivo) paso++;
  const desde = ARCO.acumulado[paso - 1]!;
  const hasta = ARCO.acumulado[paso]!;
  const fraccion = hasta > desde ? (objetivo - desde) / (hasta - desde) : 0;
  const angulo = Math.PI - (Math.PI * (paso - 1 + fraccion)) / PASOS_ARCO;

  const x = 50 + RADIO_X * Math.cos(angulo);
  const y = esInferior
    ? 12 + RADIO_Y * Math.sin(angulo)
    : 88 - RADIO_Y * Math.sin(angulo);
  return { left: `${x}%`, top: `${y}%` };
}

/** Crown shape per tooth type: incisors are narrow blades, canines point,
 *  premolars are oval and molars are the widest blocks. The rounded end faces
 *  the arch centre, so the upper arch hangs its crown down and the lower up. */
function formaDiente(numero: number, esInferior: boolean) {
  const tipo = numero % 10;
  if (tipo <= 2) {
    return {
      width: "calc(var(--diente) * 0.6)",
      height: "calc(var(--diente) * 1.15)",
      borderRadius: esInferior ? "45% 45% 10% 10%" : "10% 10% 45% 45%",
    };
  }
  if (tipo === 3) {
    return {
      width: "calc(var(--diente) * 0.7)",
      height: "calc(var(--diente) * 1.12)",
      borderRadius: esInferior ? "50% 50% 6% 6%" : "6% 6% 50% 50%",
    };
  }
  if (tipo <= 5) {
    return {
      width: "calc(var(--diente) * 0.85)",
      height: "calc(var(--diente) * 0.88)",
      borderRadius: "38%",
    };
  }
  return {
    width: "calc(var(--diente) * 0.95)",
    height: "calc(var(--diente) * 0.75)",
    borderRadius: "18%",
  };
}

export function Odontograma({
  idPrefix,
  dientes,
  color,
  onDientesChange,
  onColorChange,
}: Props) {
  const seleccionado = new Set(dientes);

  function toggle(numero: number) {
    onDientesChange(
      seleccionado.has(numero)
        ? dientes.filter((diente) => diente !== numero)
        : [...dientes, numero],
    );
  }

  const arco = (numeros: readonly number[], etiqueta: string, esInferior: boolean) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{etiqueta}</span>
      <div className="relative aspect-[2.4/1] w-full">
        {numeros.map((numero, indice) => {
          const activo = seleccionado.has(numero);
          return (
            <button
              key={numero}
              type="button"
              aria-pressed={activo}
              aria-label={`Diente ${numero}`}
              onClick={() => toggle(numero)}
              style={{
                ...posicionEnArco(indice, numeros.length, esInferior),
                ...formaDiente(numero, esInferior),
              }}
              className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center border text-[8px] font-medium leading-none tabular-nums transition-colors ${
                activo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-body/30 bg-background text-body hover:border-highlight/60 hover:bg-muted"
              }`}
            >
              {numero}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className="mx-auto flex w-full max-w-[320px] flex-col gap-2"
        style={{ "--diente": "clamp(16px, 4.4vw, 20px)" } as React.CSSProperties}
      >
        {arco(ARCO_SUPERIOR, "Superior", false)}
        {arco(ARCO_INFERIOR, "Inferior", true)}
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor={`${idPrefix}_color`}
          className="shrink-0 text-xs font-medium text-body"
        >
          Color del trabajo
        </label>
        <input
          id={`${idPrefix}_color`}
          value={color}
          maxLength={COLOR_MAX_LENGTH}
          placeholder="Ej. A2"
          onChange={(event) => onColorChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {dientes.length === 0
          ? "Selecciona los dientes sobre los que se realiza el trabajo."
          : `Dientes: ${[...dientes].sort((a, b) => a - b).join(", ")}`}
      </p>
    </div>
  );
}
