import { Check, Minus, UserRoundCheck } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { rolLabel } from "@/lib/data/gestion";
import { PERMISOS } from "@/lib/data/permisos";
import { ROLES } from "@/lib/data/types";
import type { PermisoRol } from "@/lib/data/types";

function Cell({ permiso }: { permiso: PermisoRol }) {
  const content = {
    si: (
      <span className="inline-flex items-center gap-1 font-medium">
        <Check aria-hidden className="size-4 text-primary" /> Sí
      </span>
    ),
    no: (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus aria-hidden className="size-4" /> No
      </span>
    ),
    delegado: (
      <span className="inline-flex items-center gap-1 font-medium">
        <UserRoundCheck aria-hidden className="size-4 text-primary" /> Delegado
      </span>
    ),
    por_definir: (
      <Badge variant="outline" className="h-6 rounded-xl px-2.5">
        Por definir con el cliente
      </Badge>
    ),
  }[permiso.nivel];
  return (
    <div className="flex flex-col gap-1">
      {content}
      {permiso.nota ? <span className="text-xs text-muted-foreground">{permiso.nota}</span> : null}
    </div>
  );
}

/** Read-only matrix: only decided rules or rules that follow from the schema. */
export function PermisosMatrix() {
  return (
    <section aria-labelledby="permisos" className="flex flex-col gap-3">
      <div>
        <h2 id="permisos" className="font-heading text-lg font-semibold">
          Permisos por rol
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo se muestra lo que el producto ya definió o lo que se desprende del modelo de datos. Lo
          demás queda marcado como pendiente: no se ha inventado un modelo de permisos. Los asistentes
          actúan en nombre de un odontólogo asignado mediante la relación asistente-doctor.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capacidad</TableHead>
              {ROLES.map((rol) => (
                <TableHead key={rol}>{rolLabel(rol)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISOS.map((fila) => (
              <TableRow key={fila.id}>
                <TableCell className="max-w-64 whitespace-normal font-medium">{fila.capacidad}</TableCell>
                {ROLES.map((rol) => (
                  <TableCell key={rol} className="align-top whitespace-normal">
                    <Cell permiso={fila.roles[rol]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
