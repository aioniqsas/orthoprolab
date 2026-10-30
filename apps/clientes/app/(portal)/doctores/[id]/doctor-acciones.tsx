"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@repo/ui/components/dialog";
import { desactivarDoctor } from "./actions";

interface Props {
  doctorId: string;
  nombre: string;
}

export function DoctorAcciones({ doctorId, nombre }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDesactivar() {
    setIsPending(true);
    const result = await desactivarDoctor(doctorId);
    setIsPending(false);
    if (!result.ok) {
      setError(result.error ?? "Error desconocido");
      return;
    }
    setOpen(false);
    router.push("/doctores");
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Desactivar doctor
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Desactivar a {nombre}?</DialogTitle>
            <DialogDescription>
              El doctor quedará inactivo y no podrá asignarse a nuevas órdenes.
              Los trabajos existentes no se verán afectados.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending}>Cancelar</Button>} />
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleDesactivar}
            >
              {isPending ? "Desactivando…" : "Sí, desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
