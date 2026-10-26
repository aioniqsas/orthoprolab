"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { crearClinica } from "./actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight";

export function NuevaClinicaForm() {
  const [state, formAction, isPending] = useActionState(crearClinica, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* ── Datos de la clínica ─────────────────────────────────────── */}
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
            className={inputCls}
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
            className={inputCls}
            placeholder="Ej. Calle 100 # 15-20, Bogotá"
          />
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
            className={inputCls}
            placeholder="contacto@clinica.com"
          />
          <p className="text-xs text-muted-foreground">
            Este correo también será el usuario de acceso del administrador.
          </p>
        </div>
      </div>

      {/* ── Administrador de la clínica ─────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Administrador de la clínica</h2>
        <p className="text-sm text-muted-foreground">
          Se creará automáticamente un usuario con las credenciales enviadas al correo indicado.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="adminNombres" className="text-sm font-medium text-body">
              Nombres <span className="text-destructive">*</span>
            </label>
            <input
              id="adminNombres"
              name="adminNombres"
              type="text"
              required
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="adminApellidos" className="text-sm font-medium text-body">
              Apellidos <span className="text-destructive">*</span>
            </label>
            <input
              id="adminApellidos"
              name="adminApellidos"
              type="text"
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="adminCedula" className="text-sm font-medium text-body">
            Cédula <span className="text-destructive">*</span>
          </label>
          <input
            id="adminCedula"
            name="adminCedula"
            type="text"
            required
            pattern="\d{5,12}"
            inputMode="numeric"
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground">Solo dígitos, 5 a 12 caracteres.</p>
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
