import { isAdmin } from "@/lib/auth-guard";
import { getEstadosOrden, getOrdenesStats, listOrdenesPage } from "@/lib/data/repository";
import {
  listaBooleano,
  listaOpcion,
  listaOrden,
  listaPagina,
  listaTamano,
} from "@/lib/lista-params";
import { ESTADOS_ORDEN } from "@/lib/data/types";
import { esEstadoFinal, estadoLabel } from "@/lib/data/helpers";
import { OrdersTable } from "./orders-table";

const STATS_LABELS: Record<string, string> = {
  creada: "Creadas",
  recibida: "Recibidas",
  en_proceso: "En proceso",
  cancelada: "Canceladas",
  en_entrega: "En entrega",
  devuelta: "Devueltas",
  terminada: "Terminadas",
};

function OrdersStats({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {ESTADOS_ORDEN.map((codigo) => {
        const count = stats[codigo];
        return (
          <div
            key={codigo}
            className={[
              "flex flex-col gap-1 rounded-xl border border-border bg-card p-4",
              esEstadoFinal(codigo) ? "opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="text-xs text-muted-foreground">
              {STATS_LABELS[codigo] ?? estadoLabel(codigo)}
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              {count !== undefined ? count : "--"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const GRUPOS = ["activas", "terminadas", "canceladas"] as const;
const SORTS = ["orden", "creada", "entrega", "total", "doctor"] as const;

export async function OrdersView({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    grupo?: string;
    urgente?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  if (!(await isAdmin())) return null;
  const {
    q,
    page: pageParam,
    size: sizeParam,
    grupo,
    urgente,
    sort,
    order,
  } = await searchParams;
  const page = listaPagina(pageParam);
  const size = listaTamano(sizeParam);
  const filtros = {
    grupo: listaOpcion(grupo, GRUPOS),
    urgente: listaBooleano(urgente),
    sort: listaOpcion(sort, SORTS),
    order: listaOrden(order),
  };
  const [paginaOrdenes, stats, estados] = await Promise.all([
    listOrdenesPage(q, page, size, filtros),
    getOrdenesStats(),
    getEstadosOrden(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <OrdersStats stats={stats} />
      <OrdersTable
        ordenes={paginaOrdenes.data}
        total={paginaOrdenes.total}
        page={page}
        size={size}
        estados={estados}
        busquedaInicial={q ?? ""}
        filtros={{
          grupo: filtros.grupo,
          urgente: filtros.urgente,
          sort: filtros.sort,
          order: filtros.order,
        }}
      />
    </div>
  );
}
