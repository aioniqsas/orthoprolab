"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import type { Clinica, Usuario, UsuarioDetalle } from "@/lib/data/types";
import { editarUsuario } from "../actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight";
const selectCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight";

interface Props {
  usuario: UsuarioDetalle;
  clinicas: Clinica[];
}

export function EditarUsuarioForm({ usuario, clinicas }: Props) {
  const boundAction = editarUsuario.bind(null, usuario.id);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  const isClinica = usuario.rol === "clinica";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Datos del usuario</h2>

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
              defaultValue={usuario.nombres}
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
              defaultValue={usuario.apellidos}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="correo" className="text-sm font-medium text-body">
            Correo electrónico <span aria-hidden className="text-destructive">*</span>
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            required
            defaultValue={usuario.correo}
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground">
            Si cambias el correo, el usuario deberá iniciar sesión con el nuevo.
          </p>
        </div>

        {isClinica ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="clinicaId" className="text-sm font-medium text-body">
              Clínica asignada
            </label>
            <select
              id="clinicaId"
              name="clinicaId"
              defaultValue={usuario.clinica?.id != null ? String(usuario.clinica.id) : ""}
              className={selectCls}
            >
              <option value="">Sin clínica asignada</option>
              {clinicas.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
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
