"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableColumn } from "@repo/ui/components/data-table";
import { useListaUrl } from "@/lib/lista-url";
import { LISTA_TAMANOS } from "@/lib/lista-params";
import { formatCop } from "@/lib/data/helpers";
import type { Servicio } from "@/lib/data/types";
import { ActivoBadge } from "../../_components/status-badges";

function Thumb({ src, nombre }: { src: string | null | undefined; nombre: string }) {
  if (!src) {
    return (
      <span className="flex size-12 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
        <ImageIcon aria-hidden className="size-4" />
        <span className="sr-only">Sin imagen</span>
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={nombre}
      width={48}
      height={48}
      className="size-12 rounded-lg object-cover"
    />
  );
}

const columns: DataTableColumn<Servicio>[] = [
  {
    id: "imagen",
    header: "Imagen",
    render: (s) => <Thumb src={s.imagenUrl} nombre={s.nombre} />,
  },
  {
    id: "servicio",
    header: "Servicio",
    sortKey: "nombre",
    sortValue: (s) => s.nombre,
    render: (s) => (
      <Link
        href={`/catalogo/${s.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {s.nombre}
      </Link>
    ),
  },
  {
    id: "descripcion",
    header: "Descripción",
    className: "max-w-md whitespace-normal text-muted-foreground",
    render: (s) => s.descripcion ?? "Sin descripción",
  },
  {
    id: "precio",
    header: "Precio (COP)",
    align: "right",
    sortKey: "precio",
    sortValue: (s) => Number(s.precio),
    render: (s) => formatCop(s.precio),
  },
  {
    id: "estado",
    header: "Estado",
    sortKey: "activo",
    render: (s) => <ActivoBadge activo={s.activo} />,
  },
];

export function ServiciosTable({
  servicios,
  total,
  page,
  size,
  busquedaInicial,
  filtros,
}: {
  servicios: Servicio[];
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
      rows={servicios}
      columns={columns}
      rowKey={(s) => s.id}
      serverSearch={{ value: lista.value, onSearch: lista.onSearch }}
      serverFilters={[
        {
          id: "activo",
          label: "Estado",
          allLabel: "Todos",
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
        placeholder: "Buscar por nombre o descripción",
        label: "Buscar por nombre o descripción",
      }}
      renderCard={(s) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Thumb src={s.imagenUrl} nombre={s.nombre} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/catalogo/${s.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {s.nombre}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.descripcion ?? "Sin descripción"}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium tabular-nums">{formatCop(s.precio)}</span>
            <ActivoBadge activo={s.activo} />
          </div>
        </li>
      )}
      empty={
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay servicios con estos filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba con otro estado o término.</p>
        </div>
      }
    />
  );
}
