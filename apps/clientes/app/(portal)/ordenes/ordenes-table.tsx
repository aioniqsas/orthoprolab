"use client";

import Link from "next/link";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableFilter } from "@repo/ui/components/data-table";
import { formatearFecha, grupoDeEstado } from "@repo/api-client";
import type { Orden } from "@/lib/data/types";

const filters: DataTableFilter<Orden>[] = [
  {
    id: "grupo",
    label: "Estado",
    allLabel: "Todas las órdenes",
    options: [
      { value: "activas", label: "Activas" },
      { value: "terminadas", label: "Terminadas" },
      { value: "canceladas", label: "Canceladas" },
    ],
    match: (o, value) => grupoDeEstado(o.estado.codigo) === value,
  },
];

function estadoBadge(nombre: string, color: string | null) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color ?? "#6b7280" }}
    >
      {nombre}
    </span>
  );
}

function formatDate(value: string | null) {
  return formatearFecha(value, "—");
}

function doctorNombre(o: Orden) {
  return o.asignacion?.doctor
    ? `${o.asignacion.doctor.nombres} ${o.asignacion.doctor.apellidos}`
    : "—";
}

function pacienteNombre(o: Orden) {
  return o.asignacion?.paciente?.nombre ?? "—";
}

function formatCop(value: string) {
  return Number(value).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
}

export function OrdenesTable({ ordenes }: { ordenes: Orden[] }) {
  return (
    <DataTable
      rows={ordenes}
      rowKey={(o) => o.id}
      columns={[
        {
          id: "orden",
          header: "Orden",
          render: (o) => (
            <Link href={`/ordenes/${o.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
              #{o.id}
            </Link>
          ),
          searchValue: (o) => `#${o.id}`,
          sortValue: (o) => o.id,
        },
        {
          id: "doctor",
          header: "Doctor",
          render: doctorNombre,
          searchValue: (o) => (o.asignacion?.doctor ? doctorNombre(o) : ""),
          sortValue: (o) => o.asignacion?.doctor?.nombres ?? "",
        },
        {
          id: "paciente",
          header: "Paciente",
          render: pacienteNombre,
          searchValue: (o) => o.asignacion?.paciente?.nombre ?? "",
          sortValue: (o) => o.asignacion?.paciente?.nombre ?? "",
        },
        {
          id: "estado",
          header: "Estado",
          render: (o) => estadoBadge(o.estado.nombre, o.estado.color),
          searchValue: (o) => o.estado.nombre,
          sortValue: (o) => o.estado.nombre,
        },
        {
          id: "total",
          header: "Total",
          align: "right",
          // The amount is set when the order is attached to an invoice.
          render: (o) =>
            Number(o.valor) > 0 ? (
              formatCop(o.valor)
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
          sortValue: (o) => Number(o.valor),
        },
        {
          id: "creada",
          header: "Creada",
          render: (o) => formatDate(o.fechaCreacion),
          sortValue: (o) => o.fechaCreacion,
        },
        {
          id: "entrega",
          header: "Entrega",
          render: (o) => formatDate(o.fechaEntrega),
          sortValue: (o) => o.fechaEntrega ?? "",
        },
      ]}
      search={{ placeholder: "Buscar por número, doctor o paciente", label: "Buscar por número, doctor o paciente" }}
      filters={filters}
      initialFilterValues={{ grupo: "activas" }}
      initialSort={{ id: "creada", dir: "asc" }}
      renderCard={(o) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/ordenes/${o.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              #{o.id}
            </Link>
            {estadoBadge(o.estado.nombre, o.estado.color)}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Doctor</dt>
              <dd>{doctorNombre(o)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Paciente</dt>
              <dd>{pacienteNombre(o)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="tabular-nums">
                {Number(o.valor) > 0 ? formatCop(o.valor) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Creada</dt>
              <dd>{formatDate(o.fechaCreacion)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Entrega</dt>
              <dd>{formatDate(o.fechaEntrega)}</dd>
            </div>
          </dl>
        </li>
      )}
      empty={
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">
            {ordenes.length === 0 ? "Todavía no hay órdenes" : "No hay órdenes con estos filtros"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ordenes.length === 0
              ? "Cuando crees una orden aparecerá aquí."
              : "Prueba con otra búsqueda o limpia los filtros."}
          </p>
        </div>
      }
    />
  );
}
