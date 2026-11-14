"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatearFecha } from "@repo/api-client";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableColumn } from "@repo/ui/components/data-table";
import { GRUPO_CUENTA_LABELS } from "@repo/api-client";
import type { GrupoCuenta } from "@repo/api-client";
import { useListaUrl } from "@/lib/lista-url";
import { LISTA_TAMANOS } from "@/lib/lista-params";
import type { CuentaCobro, EstadoCuentaCobro } from "@/lib/data/types";

const ESTADO_LABEL: Record<EstadoCuentaCobro, string> = {
  borrador: "Sin emitir",
  emitida: "Emitida",
  pagada: "Pagada",
  pagada_parcial: "Pago parcial",
  anulada: "Anulada",
};

const ESTADO_CLASS: Record<EstadoCuentaCobro, string> = {
  borrador: "bg-muted text-muted-foreground",
  emitida: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pagada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pagada_parcial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600",
  anulada: "bg-destructive/10 text-destructive",
};

function EstadoBadge({ estado }: { estado: EstadoCuentaCobro }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASS[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}

const columns: DataTableColumn<CuentaCobro>[] = [
  {
    id: "numero",
    header: "Número",
    sortKey: "numero",
    sortValue: (c) => c.numero,
    render: (c) => (
      <Link
        href={`/cuentas-cobro/${c.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {c.numero}
      </Link>
    ),
  },
  {
    id: "estado",
    header: "Estado",
    sortKey: "estado",
    render: (c) => <EstadoBadge estado={c.estado} />,
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    sortKey: "total",
    sortValue: (c) => Number(c.total),
    render: (c) => <span className="tabular-nums">${Number(c.total).toLocaleString("es-CO")}</span>,
  },
  {
    id: "fechaEmision",
    header: "Emitida",
    sortKey: "fecha",
    sortValue: (c) => c.fechaEmision ?? "",
    render: (c) => formatearFecha(c.fechaEmision, "—"),
  },
  {
    id: "fechaVencimiento",
    header: "Vence",
    sortValue: (c) => c.fechaVencimiento ?? "",
    render: (c) => formatearFecha(c.fechaVencimiento, "—"),
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

export function CuentasTable({
  cuentas,
  total,
  page,
  size,
  busquedaInicial,
  filtros,
}: {
  cuentas: CuentaCobro[];
  total: number;
  page: number;
  size: number;
  busquedaInicial: string;
  filtros?: { grupo?: string; sort?: string; order?: "asc" | "desc" };
}) {
  const lista = useListaUrl({
    q: busquedaInicial,
    sort: filtros?.sort,
    order: filtros?.order,
    filterIds: ["grupo"],
  });
  return (
    <DataTable
      rows={cuentas}
      columns={columns}
      rowKey={(c) => c.id}
      serverSearch={{ value: lista.value, onSearch: lista.onSearch }}
      serverFilters={[
        {
          id: "grupo",
          label: "Estado",
          allLabel: "Todos los estados",
          options: (Object.keys(GRUPO_CUENTA_LABELS) as GrupoCuenta[]).map(
            (grupo) => ({ value: grupo, label: GRUPO_CUENTA_LABELS[grupo] }),
          ),
          value: lista.filterValues.grupo ?? "all",
          onChange: (value) => lista.onFilter("grupo", value),
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
      search={{ placeholder: "Buscar por número", label: "Buscar por número" }}
      renderCard={(c) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/cuentas-cobro/${c.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {c.numero}
            </Link>
            <EstadoBadge estado={c.estado} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm tabular-nums">${Number(c.total).toLocaleString("es-CO")}</span>
            <span className="text-xs text-muted-foreground">
              Emitida: {formatearFecha(c.fechaEmision, "—")}
            </span>
          </div>
        </li>
      )}
    />
  );
}
