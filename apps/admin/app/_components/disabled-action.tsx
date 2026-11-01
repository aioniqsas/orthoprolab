import * as React from "react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";

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
      <ActionButton variant={variant} disabled aria-describedby={id}>
        {children}
      </ActionButton>
      <span id={id} className="sr-only">
        {reason}
      </span>
    </span>
  );
}

export const ORDENES_REASON = "Disponible cuando el backend de órdenes esté conectado";
export const CLINICAS_REASON = "Disponible cuando el backend de clínicas esté conectado";
export const USUARIOS_REASON = "Disponible cuando el backend de usuarios esté conectado";
export const CATALOGO_REASON = "Disponible cuando el backend del catálogo esté conectado";
export const CMS_REASON = "Disponible cuando exista un backend de contenido web";
