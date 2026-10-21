"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { deleteServicio, toggleActivoServicio } from "./actions";

export function ServicioAcciones({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, after: () => void) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo completar la acción");
      return;
    }
    after();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              () => toggleActivoServicio(id, !activo),
              () => router.refresh(),
            )
          }
        >
          {activo ? "Desactivar" : "Activar"}
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Eliminar este servicio? Si tiene órdenes asociadas solo se desactivará.")) {
              return;
            }
            run(
              () => deleteServicio(id),
              () => router.push("/catalogo"),
            );
          }}
        >
          Eliminar
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
