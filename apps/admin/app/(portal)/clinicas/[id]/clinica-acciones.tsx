"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@repo/ui/components/dialog";
import { eliminarClinica } from "./actions";

export function ClinicaAcciones({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
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
      <Dialog>
        <DialogTrigger render={<Button variant="destructive">Eliminar</Button>} />
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>¿Eliminar clínica?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La clínica solo puede eliminarse
              si no tiene doctores asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancelar</Button>} />
            <Button variant="destructive" disabled={pending} onClick={handleDelete}>
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
