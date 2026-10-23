import { Badge } from "@repo/ui/components/badge";
import { estadoLabel } from "@/lib/data/helpers";
import type { EstadoOrden } from "@/lib/data/types";

const VARIANT: Record<import("@/lib/data/types").EstadoOrden, "outline" | "secondary" | "default" | "destructive"> = {
  creada: "outline",
  recibida: "outline",
  en_proceso: "secondary",
  cancelada: "destructive",
  en_entrega: "secondary",
  devuelta_correccion: "outline",
  terminada: "default",
};

export function EstadoBadge({ estado }: { estado: EstadoOrden }) {
  return (
    <Badge variant={VARIANT[estado]} className="h-6 rounded-xl px-2.5">
      {estadoLabel(estado)}
    </Badge>
  );
}

export function UrgenteBadge() {
  return (
    <Badge variant="destructive" className="h-6 rounded-xl px-2.5">
      Urgente
    </Badge>
  );
}
