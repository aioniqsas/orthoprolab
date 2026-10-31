"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import type { OrdenDisponible } from "@/lib/data/types";
import { formatDate } from "@/lib/data/helpers";
import { adjuntarOrdenes } from "./actions";

interface Props {
  cuentaId: string;
  ordenes: OrdenDisponible[];
}

export function AdjuntarOrdenesForm({ cuentaId, ordenes }: Props) {
  const boundAction = adjuntarOrdenes.bind(null, cuentaId);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  if (ordenes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay órdenes disponibles para este doctor.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {ordenes.map((orden) => (
          <li
            key={orden.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
          >
            <input
              type="checkbox"
              id={`orden-${orden.id}`}
              name="ordenId"
              value={orden.id}
              className="rounded border-border"
            />
            <label
              htmlFor={`orden-${orden.id}`}
              className="flex flex-1 flex-wrap items-center justify-between gap-2 cursor-pointer"
            >
              <span className="text-sm font-medium">Orden #{orden.id}</span>
              <span className="text-sm text-muted-foreground">
                {orden.asignacion?.paciente.nombre ?? "Sin paciente"}
              </span>
              <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                {orden.estado.nombre}
              </span>
              <span className="flex items-center gap-1.5">
                <label
                  htmlFor={`valor-${orden.id}`}
                  className="text-xs text-muted-foreground"
                >
                  Valor
                </label>
                <input
                  id={`valor-${orden.id}`}
                  name={`valor_${orden.id}`}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  className="w-28 rounded-md border border-border bg-input px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(orden.fechaCreacion)}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          Órdenes adjuntadas correctamente.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
          ) : null}
          Adjuntar seleccionadas
        </Button>
      </div>
    </form>
  );
}
