import { Badge } from "@repo/ui/components/badge";
import { estadoLabel } from "@/lib/data/helpers";
import type { EstadoOrden } from "@/lib/data/types";

const VARIANT = {
  recibida: "outline",
  en_produccion: "secondary",
  terminada: "default",
} as const;

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
