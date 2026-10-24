import { Badge } from "@repo/ui/components/badge";
import { rolLabel } from "@/lib/data/gestion";
import type { RolNombre } from "@/lib/data/types";

const ROL_VARIANT = {
  administrador: "default",
  clinica: "secondary",
} as const;

export function RolBadge({ rol }: { rol: RolNombre }) {
  return (
    <Badge variant={ROL_VARIANT[rol]} className="h-6 rounded-xl px-2.5">
      {rolLabel(rol)}
    </Badge>
  );
}

export function ActivoBadge({ activo }: { activo: boolean }) {
  return (
    <Badge variant={activo ? "default" : "outline"} className="h-6 rounded-xl px-2.5">
      {activo ? "Activo" : "Inactivo"}
    </Badge>
  );
}
