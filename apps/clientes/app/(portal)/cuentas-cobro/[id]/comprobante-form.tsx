"use client";
import { useActionState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import { subirComprobante } from "./actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight";

export function ComprobanteForm({
  cuentaId,
  hoy,
}: {
  cuentaId: string;
  hoy: string;
}) {
  const action = subirComprobante.bind(null, cuentaId);
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="monto" className="text-sm font-medium text-body">
            Monto pagado <span className="text-destructive">*</span>
          </label>
          <input
            id="monto"
            name="monto"
            type="number"
            min="0.01"
            step="0.01"
            required
            className={inputCls}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fechaPago" className="text-sm font-medium text-body">
            Fecha de pago <span className="text-destructive">*</span>
          </label>
          <input
            id="fechaPago"
            name="fechaPago"
            type="date"
            required
            defaultValue={hoy}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="referencia" className="text-sm font-medium text-body">
            Referencia
          </label>
          <input
            id="referencia"
            name="referencia"
            type="text"
            maxLength={100}
            className={inputCls}
            placeholder="N.º de transacción"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="comprobante" className="text-sm font-medium text-body">
            Comprobante <span className="text-destructive">*</span>
          </label>
          <input
            id="comprobante"
            name="comprobante"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground">
            PDF o imagen, máximo 5 MB.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notas" className="text-sm font-medium text-body">
          Notas
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          maxLength={500}
          className={`${inputCls} resize-none`}
          placeholder="Notas opcionales sobre el pago"
        />
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          Pago registrado. Enviamos el comprobante a los administradores.
        </p>
      ) : null}

      <div className="flex justify-end">
        <ActionButton type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="mr-2 size-4" aria-hidden />
          )}
          Enviar comprobante
        </ActionButton>
      </div>
    </form>
  );
}
