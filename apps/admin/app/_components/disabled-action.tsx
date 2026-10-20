import * as React from "react";
import { Button } from "@repo/ui/components/button";

/** Button for an action that needs a backend that is not connected yet. */
export function DisabledAction({
  children,
  reason,
  variant = "outline",
  id,
}: {
  children: React.ReactNode;
  reason: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  id: string;
}) {
  return (
    <span title={reason} className="inline-flex">
      <Button variant={variant} disabled aria-describedby={id}>
        {children}
      </Button>
      <span id={id} className="sr-only">
        {reason}
      </span>
    </span>
  );
}

export const ORDENES_REASON = "Disponible cuando el backend de órdenes esté conectado";
export const CLINICAS_REASON = "Disponible cuando el backend de clínicas esté conectado";
