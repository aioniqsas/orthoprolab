"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { ActionButton } from "@repo/ui/action-button";

/**
 * Frontera de error del portal.
 *
 * Captura los fallos que no llegan a una server action —el caso típico es
 * «An unexpected response was received from the server», que aparece cuando el
 * proxy redirige a /login por sesión vencida o cuando la respuesta es HTML en
 * lugar del payload de la acción—. Muestra el `digest` de Next, que es la misma
 * clave que queda impresa en la terminal del servidor.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const ref = error.digest ?? "sin-digest";
  const router = useRouter();

  useEffect(() => {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        nivel: "error",
        ambito: "portal.frontera",
        ref,
        mensaje: error.message,
      }),
    );
  }, [error, ref]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle aria-hidden className="size-5 text-destructive" />
        <h1 className="font-heading text-lg font-semibold">Algo falló en esta pantalla</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Puede ser una sesión vencida: si vuelve a pasar, cierra sesión y entra de nuevo. Si
        persiste, comparte la referencia con el equipo técnico.
      </p>
      <p className="text-sm">
        Referencia: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{ref}</code>
      </p>
      <div className="flex gap-2">
        <ActionButton type="button" onClick={reset}>
          Reintentar
        </ActionButton>
        <ActionButton
          intent="outline"
          type="button"
          onClick={() => router.push("/login")}
        >
          Ir a iniciar sesión
        </ActionButton>
      </div>
    </section>
  );
}
