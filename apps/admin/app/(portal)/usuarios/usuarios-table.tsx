"use client";

import Link from "next/link";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableColumn } from "@repo/ui/components/data-table";
import { useListaUrl } from "@/lib/lista-url";
import { LISTA_TAMANOS } from "@/lib/lista-params";
import { rolLabel } from "@/lib/data/gestion";
import { fullName } from "@/lib/data/helpers";
import { ROLES } from "@/lib/data/types";
import type { Usuario } from "@/lib/data/types";
import { ActivoBadge, RolBadge } from "../../_components/status-badges";

const columns: DataTableColumn<Usuario>[] = [
  {
    id: "usuario",
    header: "Usuario",
    sortKey: "nombre",
    sortValue: (u) => fullName(u),
    render: (u) => (
      <Link
        href={`/usuarios/${u.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {fullName(u)}
      </Link>
    ),
  },
  {
    id: "correo",
    header: "Correo",
    sortKey: "correo",
    sortValue: (u) => u.correo,
    render: (u) => u.correo,
  },
  {
    id: "rol",
    header: "Rol",
    sortKey: "rol",
    render: (u) => <RolBadge rol={u.rol} />,
  },
  {
    id: "estado",
    header: "Estado",
    sortKey: "activo",
    render: (u) => <ActivoBadge activo={u.activo} />,
  },
  {
    id: "cedula",
    header: "Cédula",
    className: "font-mono text-xs",
    render: (u) => u.cedulaEnmascarada,
  },
];

export function UsuariosTable({
  usuarios,
  total,
  page,
  size,
  busquedaInicial,
  filtros,
}: {
  usuarios: Usuario[];
  total: number;
  page: number;
  size: number;
  busquedaInicial: string;
  filtros?: { activo?: boolean; sort?: string; order?: "asc" | "desc" };
}) {
  const lista = useListaUrl({
    q: busquedaInicial,
    sort: filtros?.sort,
    order: filtros?.order,
    filterIds: ["activo"],
  });
  return (
    <DataTable
      rows={usuarios}
      columns={columns}
      rowKey={(u) => u.id}
      serverSearch={{ value: lista.value, onSearch: lista.onSearch }}
      serverFilters={[
        {
          id: "activo",
          label: "Estado",
          allLabel: "Todos los estados",
          options: [
            { value: "true", label: "Activos" },
            { value: "false", label: "Inactivos" },
          ],
          value: lista.filterValues.activo ?? "all",
          onChange: (value) => lista.onFilter("activo", value),
        },
      ]}
      serverSort={{ sort: lista.sort, order: lista.order, onSort: lista.onSort }}
      serverPagination={{
        page,
        size,
        total,
        onPage: lista.onPage,
        onSize: lista.onSize,
        pageSizeOptions: LISTA_TAMANOS,
      }}
      search={{
        placeholder: "Buscar por nombre o correo",
        label: "Buscar por nombre o correo",
      }}
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
