"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { registrarPago } from "./actions";

interface Props {
  cuentaId: string;
}

const METODOS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "otro", label: "Otro" },
];

export function RegistrarPagoForm({ cuentaId }: Props) {
  const boundAction = registrarPago.bind(null, cuentaId);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="monto" className="text-sm font-medium text-body">
            Monto <span className="text-destructive">*</span>
          </label>
          <input
            id="monto"
            name="monto"
            type="number"
            min="0.01"
            step="0.01"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
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
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="metodo" className="text-sm font-medium text-body">
            Método <span className="text-destructive">*</span>
          </label>
          <select
            id="metodo"
            name="metodo"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          >
            <option value="">Selecciona un método</option>
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="referencia" className="text-sm font-medium text-body">
            Referencia
          </label>
          <input
            id="referencia"
            name="referencia"
            type="text"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
            placeholder="N.º de transacción o cheque"
          />
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
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight resize-none"
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
          Pago registrado correctamente.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
          ) : null}
          Registrar pago
        </Button>
      </div>
    </form>
  );
}
