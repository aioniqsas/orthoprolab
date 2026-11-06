"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import type { Doctor } from "@/lib/data/types";
import { editarDoctor } from "../actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight";

export function EditarDoctorForm({ doctor }: { doctor: Doctor }) {
  const action = editarDoctor.bind(null, String(doctor.id));
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Datos del doctor</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="nombres" className="text-sm font-medium text-body">
              Nombres <span aria-hidden className="text-destructive">*</span>
            </label>
            <input
              id="nombres"
              name="nombres"
              type="text"
              required
              defaultValue={doctor.nombres}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="apellidos" className="text-sm font-medium text-body">
              Apellidos <span aria-hidden className="text-destructive">*</span>
            </label>
            <input
              id="apellidos"
              name="apellidos"
              type="text"
              required
              defaultValue={doctor.apellidos}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="correo" className="text-sm font-medium text-body">
            Correo electrónico
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            defaultValue={doctor.correo ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <ActionButton type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin mr-1" aria-hidden /> : null}
          Guardar cambios
        </ActionButton>
      </div>
    </form>
  );
}
