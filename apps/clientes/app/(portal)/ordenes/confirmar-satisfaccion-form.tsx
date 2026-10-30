"use client";

import { useActionState } from "react";
import { Button } from "@repo/ui/components/button";
import { finalizarOrdenAction } from "./actions";

interface Props {
  ordenId: string;
}

export function ConfirmarSatisfaccionForm({ ordenId }: Props) {
  const action = finalizarOrdenAction.bind(null, ordenId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <section
      aria-labelledby="confirmar-satisfaccion-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h2 id="confirmar-satisfaccion-heading" className="font-heading text-lg font-semibold">
        Confirmar satisfacción
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Si la orden quedó satisfactoria, confírmala para marcarla como terminada.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p role="status" className="text-sm text-muted-foreground">
            Orden marcada como terminada.
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Confirmando..." : "Confirmar satisfacción"}
        </Button>
      </form>
    </section>
  );
}
