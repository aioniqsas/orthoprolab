"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { eliminarClinica } from "./actions";

export function ClinicaAcciones({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar esta clínica? Esta acción no se puede deshacer.")) return;
    setPending(true);
    setError(null);
    const result = await eliminarClinica(id);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo eliminar la clínica");
      return;
    }
    router.push("/clinicas");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="destructive" disabled={pending} onClick={handleDelete}>
        Eliminar
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
