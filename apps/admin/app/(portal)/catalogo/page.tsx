import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { isAdmin } from "@/lib/auth-guard";
import { filterServicios, parseServicioFilters } from "@/lib/data/gestion";
import type { ServicioFilters } from "@/lib/data/gestion";
import { formatCop } from "@/lib/data/helpers";
import { listServicios } from "@/lib/data/repository";
import { CATALOGO_REASON, DisabledAction } from "../../_components/disabled-action";
import { FilterTabs } from "../../_components/filter-tabs";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { SampleNotice } from "../../_components/sample-notice";
import { SearchForm } from "../../_components/search-form";
import { ActivoBadge } from "../../_components/status-badges";
import { ArancelesPanel } from "./aranceles-info";

export const metadata: Metadata = { title: "Catálogo y aranceles" };

function hrefWith(filters: ServicioFilters, activo: boolean | undefined): string {
  const params = new URLSearchParams();
  if (activo !== undefined) params.set("activo", activo ? "1" : "0");
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

export default function CatalogoPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo y aranceles"
        description="Servicios que ofrece el laboratorio y el precio de cada uno en pesos colombianos."
        actions={
          <DisabledAction id="nuevo-servicio-reason" variant="default" reason={CATALOGO_REASON}>
            <Plus aria-hidden /> Nuevo servicio
          </DisabledAction>
        }
      />
      <SampleNotice section="catálogo" />
      <p role="note" className="text-sm text-muted-foreground">
        Los nombres y descripciones siguen las líneas de trabajo del sitio público. Los precios
        mostrados son ficticios.
      </p>
      <Suspense fallback={<ListSkeleton />}>
        <CatalogoView searchParams={searchParams} />
      </Suspense>
      <ArancelesPanel />
    </section>
  );
}

async function CatalogoView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return null;
  const filters = parseServicioFilters(await searchParams);
  const all = await listServicios();
  const base = filterServicios(all, { q: filters.q });
  const servicios = filterServicios(all, filters);
  const tabs = [
    { activo: undefined, label: "Todos", count: base.length },
    { activo: true, label: "Activos", count: base.filter((s) => s.activo).length },
    { activo: false, label: "Inactivos", count: base.filter((s) => !s.activo).length },
  ].map((t) => ({
    href: hrefWith(filters, t.activo),
    label: t.label,
    count: t.count,
    active: filters.activo === t.activo,
  }));

  return (
    <div className="flex flex-col gap-4">
      <SearchForm
        action="/catalogo"
        q={filters.q ?? ""}
        label="Buscar servicio"
        hidden={filters.activo === undefined ? {} : { activo: filters.activo ? "1" : "0" }}
      />
      <FilterTabs label="Filtrar por estado" tabs={tabs} />
      <p role="status" className="text-sm text-muted-foreground">
        {servicios.length === 1 ? "1 servicio" : `${servicios.length} servicios`}
      </p>
      {servicios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay servicios con estos filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba con otro estado o término.</p>
        </div>
      ) : (
        <>
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-end">Precio (COP)</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicios.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`/catalogo/${s.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {s.nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                      {s.descripcion ?? "Sin descripción"}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{formatCop(s.precio)}</TableCell>
                    <TableCell>
                      <ActivoBadge activo={s.activo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {servicios.map((s) => (
              <li key={s.id} className="rounded-xl border border-border bg-card p-4">
                <Link
                  href={`/catalogo/${s.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {s.nombre}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{s.descripcion ?? "Sin descripción"}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium tabular-nums">{formatCop(s.precio)}</span>
                  <ActivoBadge activo={s.activo} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
