"use client";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import type { Clinica } from "@/lib/data/types";
import { crearUsuario } from "./actions";

interface Props {
  clinicas: Clinica[];
}

const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "clinica", label: "Administrador de clínica" },
] as const;

export function NuevoUsuarioForm({ clinicas }: Props) {
  const [state, formAction, isPending] = useActionState(crearUsuario, null);
  const [rol, setRol] = useState("");

  const showClinica = rol === "clinica";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Datos personales</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="nombres" className="text-sm font-medium text-body">
              Nombres <span className="text-destructive">*</span>
            </label>
            <input
              id="nombres"
              name="nombres"
              type="text"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="apellidos" className="text-sm font-medium text-body">
              Apellidos <span className="text-destructive">*</span>
            </label>
            <input
              id="apellidos"
              name="apellidos"
              type="text"
              required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="correo" className="text-sm font-medium text-body">
            Correo electrónico <span className="text-destructive">*</span>
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cedula" className="text-sm font-medium text-body">
            Cédula <span className="text-destructive">*</span>
          </label>
          <input
            id="cedula"
            name="cedula"
            type="text"
            required
            pattern="\d{5,12}"
            inputMode="numeric"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          />
          <p className="text-xs text-muted-foreground">Solo dígitos, 5 a 12 caracteres.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-body">
            Contraseña <span className="text-destructive">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={12}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          />
          <p className="text-xs text-muted-foreground">Mínimo 12 caracteres.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Rol y clínica</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="rol" className="text-sm font-medium text-body">
            Rol <span className="text-destructive">*</span>
          </label>
          <select
            id="rol"
            name="rol"
            required
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          >
            <option value="">Selecciona un rol</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {showClinica && (
          <div className="flex flex-col gap-1">
            <label htmlFor="clinicaId" className="text-sm font-medium text-body">
              Clínica
            </label>
            <select
              id="clinicaId"
              name="clinicaId"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              <option value="">Sin clínica asignada</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
          Crear usuario
        </Button>
      </div>
    </form>
  );
}
