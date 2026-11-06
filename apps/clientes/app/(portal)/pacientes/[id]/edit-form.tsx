"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import { actualizarPaciente } from "./actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-full";

interface Props {
  id: string;
  nombre: string;
}

export function EditPacienteForm({ id, nombre }: Props) {
  const boundAction = actualizarPaciente.bind(null, id);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-sm font-medium text-body">
          Nombre completo <span aria-hidden className="text-destructive">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          defaultValue={nombre}
          className={inputCls}
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-green-600">Nombre actualizado.</p>
      )}

      <div className="flex justify-end">
        <ActionButton type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin mr-1" aria-hidden />}
          Guardar cambios
        </ActionButton>
      </div>
    </form>
  );
}
