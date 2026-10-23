"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableColumn, DataTableFilter } from "@repo/ui/components/data-table";
import { formatDate } from "@/lib/data/helpers";
import type { CuentaCobro, EstadoCuentaCobro } from "@/lib/data/types";

const ESTADO_LABELS: Record<EstadoCuentaCobro, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  pagada_parcial: "Pago parcial",
  pagada: "Pagada",
  anulada: "Anulada",
};

const ESTADO_CLASS: Record<EstadoCuentaCobro, string> = {
  borrador:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground",
  emitida:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pagada_parcial:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  pagada:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  anulada:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function EstadoCuentaBadge({ estado }: { estado: EstadoCuentaCobro }) {
  return <span className={ESTADO_CLASS[estado]}>{ESTADO_LABELS[estado]}</span>;
}

const columns: DataTableColumn<CuentaCobro>[] = [
  {
    id: "numero",
    header: "Número",
    sortValue: (c) => c.numero,
    render: (c) => (
      <Link
        href={`/cuentas-cobro/${c.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {c.numero}
      </Link>
    ),
    searchValue: (c) => c.numero,
  },
  {
    id: "doctor",
    header: "Doctor",
    sortValue: (c) => c.doctorNombre,
    render: (c) => c.doctorNombre,
    searchValue: (c) => `${c.doctorNombre} ${c.doctorCorreo}`,
  },
  {
    id: "estado",
    header: "Estado",
    render: (c) => <EstadoCuentaBadge estado={c.estado} />,
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    sortValue: (c) => Number(c.total),
    render: (c) => (
      <span className="tabular-nums">
        ${Number(c.total).toLocaleString("es-CO")}
      </span>
    ),
  },
  {
    id: "fechaEmision",
    header: "Fecha emisión",
    sortValue: (c) => c.fechaEmision,
    render: (c) => formatDate(c.fechaEmision),
  },
  {
    id: "acciones",
    header: "",
    render: (c) => (
      <Link
        href={`/cuentas-cobro/${c.id}`}
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
        aria-label={`Ver cuenta ${c.numero}`}
      >
        Ver <ExternalLink aria-hidden className="size-3.5" />
      </Link>
    ),
  },
];

const filters: DataTableFilter<CuentaCobro>[] = [
  {
    id: "estado",
    label: "Estado",
    allLabel: "Todos los estados",
    options: (
      [
        "borrador",
        "emitida",
        "pagada_parcial",
        "pagada",
        "anulada",
      ] as EstadoCuentaCobro[]
    ).map((e) => ({ value: e, label: ESTADO_LABELS[e] })),
    match: (c, value) => c.estado === value,
  },
];

export function CuentasTable({ cuentas }: { cuentas: CuentaCobro[] }) {
  return (
    <DataTable
      rows={cuentas}
      columns={columns}
      rowKey={(c) => c.id}
      search={{
        placeholder: "Buscar por número o doctor",
        label: "Buscar por número o doctor",
      }}
      filters={filters}
      renderCard={(c) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/cuentas-cobro/${c.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {c.numero}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {c.doctorNombre}
              </p>
            </div>
            <EstadoCuentaBadge estado={c.estado} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm tabular-nums">
              ${Number(c.total).toLocaleString("es-CO")}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(c.fechaEmision)}
            </span>
          </div>
        </li>
      )}
      empty={
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">
            No hay cuentas de cobro con estos filtros
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prueba con otro estado o término.
          </p>
        </div>
      }
    />
  );
}
