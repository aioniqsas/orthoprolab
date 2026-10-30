"use client";

import {
  ARCO_INFERIOR,
  ARCO_SUPERIOR,
  COLOR_MAX_LENGTH,
  type Diente,
} from "@repo/api-client";

interface Props {
  idPrefix: string;
  value: Diente[];
  onChange: (dientes: Diente[]) => void;
}

export function Odontograma({ idPrefix, value, onChange }: Props) {
  const seleccionados = new Map(value.map((diente) => [diente.numero, diente.color]));

  function toggle(numero: number) {
    onChange(
      seleccionados.has(numero)
        ? value.filter((diente) => diente.numero !== numero)
        : [...value, { numero, color: "" }],
    );
  }

  function setColor(numero: number, color: string) {
    onChange(
      value.map((diente) => (diente.numero === numero ? { ...diente, color } : diente)),
    );
  }

  const arco = (dientes: readonly number[], etiqueta: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{etiqueta}</span>
      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
        {dientes.map((numero) => {
          const activo = seleccionados.has(numero);
          return (
            <button
              key={numero}
              type="button"
              aria-pressed={activo}
              aria-label={`Diente ${numero}`}
              onClick={() => toggle(numero)}
              className={`rounded-md border py-1 text-xs tabular-nums transition-colors ${
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
      {arco(ARCO_SUPERIOR, "Superior")}
      {arco(ARCO_INFERIOR, "Inferior")}

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Selecciona los dientes sobre los que se realiza el trabajo.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.map((diente) => (
            <li key={diente.numero} className="flex items-center gap-2">
              <label
                htmlFor={`${idPrefix}_color_${diente.numero}`}
                className="w-20 shrink-0 text-xs font-medium text-body"
              >
                Diente {diente.numero}
              </label>
              <input
                id={`${idPrefix}_color_${diente.numero}`}
                value={diente.color}
                required
                maxLength={COLOR_MAX_LENGTH}
                placeholder="Color"
                onChange={(event) => setColor(diente.numero, event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
