"use client";

import { useActionState } from "react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import type { EstadoOrdenItem } from "@/lib/data/types";
import { cambiarEstadoOrden } from "./actions";

interface Props {
  ordenId: string;
  estadoDbId: string;
  estados: EstadoOrdenItem[];
}

export function CambiarEstadoForm({ ordenId, estadoDbId, estados }: Props) {
  const action = cambiarEstadoOrden.bind(null, ordenId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <section
      aria-labelledby="cambiar-estado-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 id="cambiar-estado-heading" className="font-heading text-lg font-semibold">
        Cambiar estado
      </h2>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="estadoId" className="text-sm font-medium">
            Nuevo estado
          </label>
          <select
            id="estadoId"
            name="estadoId"
            defaultValue={estadoDbId}
            disabled={pending}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {estados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          {estados.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No se pudieron cargar los estados disponibles.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="observaciones" className="text-sm font-medium">
            Observaciones{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows={3}
            disabled={pending}
            placeholder="Notas sobre el cambio de estado..."
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p role="status" className="text-sm text-muted-foreground">
            Estado actualizado correctamente.
          </p>
        )}

        <ActionButton type="submit" disabled={pending || estados.length === 0}>
          {pending ? "Guardando..." : "Confirmar cambio"}
        </ActionButton>
      </form>
    </section>
  );
}
