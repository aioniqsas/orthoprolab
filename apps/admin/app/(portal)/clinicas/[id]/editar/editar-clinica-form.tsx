"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import type { ClinicaDetalle } from "@/lib/data/types";
import { editarClinica } from "../actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight";

export function EditarClinicaForm({ clinica }: { clinica: ClinicaDetalle }) {
  const boundAction = editarClinica.bind(null, String(clinica.id));
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Datos de la clínica</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-sm font-medium text-body">
            Nombre <span aria-hidden className="text-destructive">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            minLength={2}
            maxLength={120}
            defaultValue={clinica.nombre}
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="direccion" className="text-sm font-medium text-body">
            Dirección
          </label>
          <input
            id="direccion"
            name="direccion"
            type="text"
            maxLength={250}
            defaultValue={clinica.direccion ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <ActionButton type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Guardar cambios
        </ActionButton>
      </div>
    </form>
  );
}
