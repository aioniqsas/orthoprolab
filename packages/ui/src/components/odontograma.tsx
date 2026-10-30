"use client";

import { ARCO_INFERIOR, ARCO_SUPERIOR, COLOR_MAX_LENGTH } from "@repo/api-client";

interface Props {
  idPrefix: string;
  dientes: number[];
  color: string;
  onDientesChange: (dientes: number[]) => void;
  onColorChange: (color: string) => void;
}

/**
 * Places tooth `indice` on a half-ellipse, the way a dental mould is drawn:
 * the upper arch opens downward (∩) and the lower one upward (∪). Position is
 * a percentage so the arch scales with its container.
 */
export function posicionEnArco(indice: number, total: number, esInferior: boolean) {
  const angulo = Math.PI - (Math.PI * indice) / (total - 1);
  const x = 50 + 44 * Math.cos(angulo);
  const y = esInferior ? 12 + 76 * Math.sin(angulo) : 88 - 76 * Math.sin(angulo);
  return { left: `${x}%`, top: `${y}%` };
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
              style={posicionEnArco(indice, numeros.length, esInferior)}
              className={`absolute grid size-[clamp(18px,4.8vw,23px)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border text-[10px] tabular-nums transition-colors ${
                activo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-body hover:bg-muted"
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
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2">
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
