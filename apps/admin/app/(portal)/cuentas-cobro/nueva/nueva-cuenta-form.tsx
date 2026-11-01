"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import type { Clinica } from "@/lib/data/types";
import { crearCuentaCobro } from "./actions";

interface Props {
  clinicas: Pick<Clinica, "id" | "nombre">[];
}

export function NuevaCuentaForm({ clinicas }: Props) {
  const [state, formAction, isPending] = useActionState(crearCuentaCobro, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Clínica</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="clinicaId" className="text-sm font-medium text-body">
            Clínica responsable <span className="text-destructive">*</span>
          </label>
          <select
            id="clinicaId"
            name="clinicaId"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          >
            <option value="">Selecciona una clínica</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Opciones</h2>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="fechaVencimiento"
            className="text-sm font-medium text-body"
          >
            Fecha de vencimiento
          </label>
          <input
            id="fechaVencimiento"
            name="fechaVencimiento"
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-48"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="observaciones"
            className="text-sm font-medium text-body"
          >
            Observaciones
          </label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows={3}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight resize-none"
            placeholder="Notas internas opcionales"
          />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <ActionButton type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
          ) : null}
          Crear cuenta de cobro
        </ActionButton>
      </div>
    </form>
  );
}
