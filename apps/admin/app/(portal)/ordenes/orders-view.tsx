import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { isAdmin } from "@/lib/auth-guard";
import {
  estadoLabel,
  filterOrdenes,
  formatCop,
  formatDate,
  fullName,
  parseOrdenFilters,
} from "@/lib/data/helpers";
import type { OrdenFilters } from "@/lib/data/helpers";
import { listOrdenes } from "@/lib/data/repository";
import { ESTADOS_ORDEN } from "@/lib/data/types";
import type { Orden } from "@/lib/data/types";
import { EstadoBadge, UrgenteBadge } from "../../_components/estado-badge";

function hrefWith(filters: OrdenFilters, estado: OrdenFilters["estado"]): string {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (filters.urgente) params.set("urgente", "1");
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return qs ? `/ordenes?${qs}` : "/ordenes";
}

function StatusTabs({ filters, all }: { filters: OrdenFilters; all: Orden[] }) {
  // Counts ignore the status filter so each tab shows what it would list.
  const base = filterOrdenes(all, { ...filters, estado: undefined });
  const tabs = [
    { estado: undefined, label: "Todas", count: base.length },
    ...ESTADOS_ORDEN.map((estado) => ({
      estado,
      label: estadoLabel(estado),
      count: base.filter((o) => o.estado === estado).length,
    })),
  ];
  return (
    <nav aria-label="Filtrar por estado">
      <ul className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filters.estado === tab.estado;
          return (
            <li key={tab.label}>
              <Link
                href={hrefWith(filters, tab.estado)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
                <span className="text-xs tabular-nums">{tab.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function FilterForm({ filters }: { filters: OrdenFilters }) {
  const hasFilters = Boolean(filters.estado || filters.urgente || filters.q);
  return (
    <form method="get" action="/ordenes" role="search" className="flex flex-wrap items-center gap-3">
      {filters.estado ? <input type="hidden" name="estado" value={filters.estado} /> : null}
      <div className="relative min-w-56 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          name="q"
          defaultValue={filters.q}
          aria-label="Buscar por número, doctor o paciente"
          placeholder="Buscar por número, doctor o paciente"
          className="h-10 rounded-xl pl-8"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="urgente"
          value="1"
          defaultChecked={filters.urgente}
          className="size-4 accent-primary"
        />
        Solo urgentes
      </label>
      <Button type="submit" size="lg" className="h-10 rounded-xl px-4">
        Filtrar
      </Button>
      {hasFilters ? (
        <Link
          href="/ordenes"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Limpiar filtros
        </Link>
      ) : null}
    </form>
  );
}

function OrdersTable({ ordenes }: { ordenes: Orden[] }) {
  return (
    <div className="hidden rounded-xl border border-border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-end">Total</TableHead>
            <TableHead>Creada</TableHead>
            <TableHead>Entrega</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenes.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/ordenes/${o.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    #{o.id}
                  </Link>
                  {o.urgente ? <UrgenteBadge /> : null}
                </div>
              </TableCell>
              <TableCell>{fullName(o.doctor)}</TableCell>
              <TableCell>{o.paciente.nombre}</TableCell>
              <TableCell>
                <EstadoBadge estado={o.estado} />
              </TableCell>
              <TableCell className="text-end tabular-nums">{formatCop(o.valor)}</TableCell>
              <TableCell>{formatDate(o.fechaCreacion)}</TableCell>
              <TableCell>{formatDate(o.fechaEntrega)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrdersCards({ ordenes }: { ordenes: Orden[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {ordenes.map((o) => (
        <li key={o.id} className="rounded-xl border border-border bg-card p-4">
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
      ))}
    </ul>
  );
}

export async function OrdersView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return null;
  const filters = parseOrdenFilters(await searchParams);
  const all = await listOrdenes();
  const ordenes = filterOrdenes(all, filters);

  return (
    <div className="flex flex-col gap-4">
      <FilterForm filters={filters} />
      <StatusTabs filters={filters} all={all} />
      <p role="status" className="text-sm text-muted-foreground">
        {ordenes.length === 1 ? "1 orden" : `${ordenes.length} órdenes`}
      </p>
      {ordenes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay órdenes con estos filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prueba con otra búsqueda o limpia los filtros.
          </p>
        </div>
      ) : (
        <>
          <OrdersTable ordenes={ordenes} />
          <OrdersCards ordenes={ordenes} />
        </>
      )}
    </div>
  );
}
