import { isAdmin } from "@/lib/auth-guard";
import { getEstadosOrden, getOrdenesStats, listOrdenes } from "@/lib/data/repository";
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

export async function OrdersView({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdmin())) return null;
  const { q } = await searchParams;
  const [ordenes, stats, estados] = await Promise.all([listOrdenes(q), getOrdenesStats(), getEstadosOrden()]);
  return (
    <div className="flex flex-col gap-6">
      <OrdersStats stats={stats} />
      <OrdersTable ordenes={ordenes} estados={estados} busquedaInicial={q ?? ""} />
    </div>
  );
}
