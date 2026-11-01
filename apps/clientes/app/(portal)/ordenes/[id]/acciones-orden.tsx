"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@repo/ui/action-button";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { API_URL } from "@/lib/api";

export function AccionesOrden({ ordenId, puedeEditar }: { ordenId: string; puedeEditar: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState("");

  if (!puedeEditar) return null;

  async function cancelar() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/mi-clinica/ordenes/${ordenId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observaciones: obs || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { message?: string | string[] }).message;
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg || "No se pudo cancelar");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton intent="outline" onClick={() => router.push(`/ordenes/${ordenId}/editar`)}>
        Editar orden
      </ActionButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<ActionButton intent="danger">Cancelar orden</ActionButton>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar orden</DialogTitle>
            <DialogDescription>
              Solo se puede cancelar si aún está en estado Creada. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="obs-cancel" className="text-sm font-medium">
              Observaciones (opcional)
            </label>
            <textarea
              id="obs-cancel"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose render={<ActionButton intent="outline" disabled={pending}>Cerrar</ActionButton>} />
            <ActionButton intent="danger" disabled={pending} onClick={cancelar}>
              {pending ? "Cancelando..." : "Cancelar orden"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
