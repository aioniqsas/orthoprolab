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
import { regenerarCredenciales, toggleActivoUsuario } from "./actions";

export function UsuarioAcciones({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [credsSent, setCredsSent] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleToggle() {
    setPending(true);
    setError(null);
    const result = await toggleActivoUsuario(id, !activo);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo cambiar el estado");
      return;
    }
    router.refresh();
  }

  async function handleRegenerar() {
    setPending(true);
    setError(null);
    const result = await regenerarCredenciales(id);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo regenerar las credenciales");
      return;
    }
    setCredsSent(true);
    setOpen(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activo ? "destructive" : "outline"}
          disabled={pending}
          onClick={handleToggle}
        >
          {activo ? "Desactivar" : "Activar"}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline">Regenerar credenciales</Button>} />
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>¿Regenerar credenciales?</DialogTitle>
              <DialogDescription>
                Se generará una nueva contraseña aleatoria y se enviará al correo
                del usuario. La contraseña anterior quedará invalidada.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancelar</Button>} />
              <Button disabled={pending} onClick={handleRegenerar}>
                {pending ? "Enviando…" : "Sí, regenerar y enviar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {credsSent ? (
        <p className="text-sm text-green-600">
          Credenciales regeneradas y enviadas al correo del usuario.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
