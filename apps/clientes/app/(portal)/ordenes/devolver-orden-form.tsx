"use client";

import { useActionState } from "react";
import { Button } from "@repo/ui/components/button";
import { devolverOrdenAction } from "./actions";

interface Props {
  ordenId: string;
}

export function DevolverOrdenForm({ ordenId }: Props) {
  const action = devolverOrdenAction.bind(null, ordenId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <section
      aria-labelledby="devolver-orden-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 id="devolver-orden-heading" className="font-heading text-lg font-semibold">
        Devolver para corrección
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        La observación es obligatoria para indicar el motivo de la devolución.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="observaciones" className="text-sm font-medium">
            Motivo de la devolución
          </label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows={3}
            required
            disabled={pending}
            placeholder="Describe el motivo de la devolución..."
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
            Orden devuelta para corrección.
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Devolver para corrección"}
        </Button>
      </form>
    </section>
  );
}
