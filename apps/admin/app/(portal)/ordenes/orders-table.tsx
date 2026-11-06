"use client";

import Link from "next/link";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableColumn, DataTableFilter } from "@repo/ui/components/data-table";
import { grupoDeEstado } from "@repo/api-client";
import { esEstadoFinal, formatCop, formatDate, fullName } from "@/lib/data/helpers";
import type { Orden } from "@/lib/data/types";
import { EstadoBadge, UrgenteBadge } from "../../_components/estado-badge";
import { EstadoFilaSelect } from "./estado-fila-select";


const filters: DataTableFilter<Orden>[] = [
  {
    id: "grupo",
    label: "Estado",
    allLabel: "Todas las órdenes",
    // Tres grupos en vez de siete estados: menos opciones, menos ruido.
    options: [
      { value: "activas", label: "Activas" },
      { value: "terminadas", label: "Terminadas" },
      { value: "canceladas", label: "Canceladas" },
    ],
    match: (o, value) => grupoDeEstado(o.estado) === value,
  },
  {
    id: "urgencia",
    label: "Urgencia",
    allLabel: "Todas",
    options: [{ value: "1", label: "Solo urgentes" }],
    match: (o, value) => (value === "1" ? o.urgente : true),
  },
];

export function OrdersTable({ ordenes, estados }: { ordenes: Orden[]; estados: { id: string; codigo: string; nombre: string }[] }) {
  const columns: DataTableColumn<Orden>[] = [
  {
    id: "orden",
    header: "Orden",
    sortValue: (o) => o.id,
    render: (o) => (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/ordenes/${o.id}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          #{o.id}
        </Link>
        {o.urgente ? <UrgenteBadge /> : null}
      </div>
    ),
    searchValue: (o) => `#${o.id}`,
  },
  {
    id: "doctor",
    header: "Doctor",
    sortValue: (o) => fullName(o.doctor),
    render: (o) => fullName(o.doctor),
    searchValue: (o) => fullName(o.doctor),
  },
  {
    id: "paciente",
    header: "Paciente",
    sortValue: (o) => o.paciente.nombre,
    render: (o) => o.paciente.nombre,
    searchValue: (o) => o.paciente.nombre,
  },
  {
    id: "estado",
    header: "Estado",
    // Un estado final no admite cambios: se muestra como distintivo.
    render: (o) =>
      esEstadoFinal(o.estado) ? (
        <EstadoBadge estado={o.estado} />
      ) : (
        <EstadoFilaSelect
          key={o.id}
          ordenId={String(o.id)}
          estadoActualCodigo={o.estado}
          estados={estados}
        />
      ),
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    sortValue: (o) => Number(o.valor),
    // The amount is set when the order is attached to an invoice.
    render: (o) =>
      Number(o.valor) > 0 ? (
        formatCop(o.valor)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "creada",
    header: "Creada",
    sortValue: (o) => o.fechaCreacion,
    render: (o) => formatDate(o.fechaCreacion),
  },
  {
    id: "entrega",
    header: "Entrega",
    sortValue: (o) => o.fechaEntrega ?? "",
    render: (o) => formatDate(o.fechaEntrega),
  },
];
  return (
    <DataTable
      rows={ordenes}
      columns={columns}
      rowKey={(o) => String(o.id)}
      initialSort={{ id: "creada", dir: "asc" }}
      initialFilterValues={{ grupo: "activas" }}
      search={{
        placeholder: "Buscar por número, doctor o paciente",
        label: "Buscar por número, doctor o paciente",
      }}
      filters={filters}
      renderCard={(o) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/ordenes/${o.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Orden #{o.id}
            </Link>
            <div className="flex gap-2">
              {o.urgente ? <UrgenteBadge /> : null}
              <EstadoBadge estado={o.estado} />
            </div>
          </div>
          <p className="mt-2 text-sm">{fullName(o.doctor)}</p>
          <p className="text-sm text-muted-foreground">{o.paciente.nombre}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <dt>Total</dt>
              <dd className="text-sm text-foreground tabular-nums">{formatCop(o.valor)}</dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd className="text-sm text-foreground">{formatDate(o.fechaEntrega)}</dd>
            </div>
          </dl>
        </li>
      )}
      empty={
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay órdenes con estos filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prueba con otra búsqueda o limpia los filtros.
          </p>
        </div>
      }
    />
  );
}
