"use client";

import Link from "next/link";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableColumn, DataTableFilter } from "@repo/ui/components/data-table";
import { rolLabel } from "@/lib/data/gestion";
import { fullName } from "@/lib/data/helpers";
import { ROLES } from "@/lib/data/types";
import type { Usuario } from "@/lib/data/types";
import { ActivoBadge, RolBadge } from "../../_components/status-badges";

const columns: DataTableColumn<Usuario>[] = [
  {
    id: "usuario",
    header: "Usuario",
    sortValue: (u) => fullName(u),
    render: (u) => (
      <Link
        href={`/usuarios/${u.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {fullName(u)}
      </Link>
    ),
    searchValue: (u) => fullName(u),
  },
  {
    id: "correo",
    header: "Correo",
    sortValue: (u) => u.correo,
    render: (u) => u.correo,
    searchValue: (u) => u.correo,
  },
  {
    id: "rol",
    header: "Rol",
    render: (u) => <RolBadge rol={u.rol} />,
  },
  {
    id: "estado",
    header: "Estado",
    render: (u) => <ActivoBadge activo={u.activo} />,
  },
  {
    id: "cedula",
    header: "Cédula",
    className: "font-mono text-xs",
    render: (u) => u.cedulaEnmascarada,
  },
];

const filters: DataTableFilter<Usuario>[] = [
  {
    id: "rol",
    label: "Rol",
    allLabel: "Todos los roles",
    options: ROLES.map((rol) => ({ value: rol, label: rolLabel(rol) })),
    match: (u, value) => u.rol === value,
  },
  {
    id: "estado",
    label: "Estado",
    allLabel: "Todos los estados",
    options: [
      { value: "1", label: "Activos" },
      { value: "0", label: "Inactivos" },
    ],
    match: (u, value) => u.activo === (value === "1"),
  },
];

export function UsuariosTable({ usuarios }: { usuarios: Usuario[] }) {
  return (
    <DataTable
      rows={usuarios}
      columns={columns}
      rowKey={(u) => u.id}
      search={{
        placeholder: "Buscar por nombre o correo",
        label: "Buscar por nombre o correo",
      }}
      filters={filters}
      renderCard={(u) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <Link
            href={`/usuarios/${u.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {fullName(u)}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{u.correo}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RolBadge rol={u.rol} />
            <ActivoBadge activo={u.activo} />
          </div>
        </li>
      )}
      empty={
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay usuarios con estos filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba con otro rol o término.</p>
        </div>
      }
    />
  );
}
