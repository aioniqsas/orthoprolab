"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { crearClinica } from "./actions";

export function NuevaClinicaForm() {
  const [state, formAction, isPending] = useActionState(crearClinica, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Datos de la clínica</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-sm font-medium text-body">
            Nombre <span className="text-destructive">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
            placeholder="Ej. Clínica Dental Aurora"
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
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
            placeholder="Ej. Calle 100 # 15-20, Bogotá"
          />
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
          Registrar clínica
        </Button>
      </div>
    </form>
  );
}
