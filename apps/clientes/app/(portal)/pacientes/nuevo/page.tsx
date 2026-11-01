"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import { crearPaciente } from "./actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-full";

export default function NuevoPacientePage() {
  const [state, formAction, isPending] = useActionState(crearPaciente, null);

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div className="flex items-center gap-3">
        <Link href="/pacientes" className="text-sm text-highlight hover:underline">
          ← Pacientes
        </Link>
        <h1 className="text-xl font-bold text-title">Nuevo paciente</h1>
      </div>

      <form action={formAction} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="cedula" className="text-sm font-medium text-body">
            Cédula <span aria-hidden className="text-destructive">*</span>
          </label>
          <input
            id="cedula"
            name="cedula"
            type="text"
            required
            placeholder="Número de cédula"
            className={inputCls}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-sm font-medium text-body">
            Nombre completo <span aria-hidden className="text-destructive">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            placeholder="Nombre completo del paciente"
            className={inputCls}
          />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Link
            href="/pacientes"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-alt transition-colors"
          >
            Cancelar
          </Link>
          <ActionButton type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin mr-1" aria-hidden />}
            Guardar
          </ActionButton>
        </div>
      </form>
    </div>
  );
}
