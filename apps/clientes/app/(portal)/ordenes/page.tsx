import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { listOrdenesPage } from "@/lib/data/repository";
import {
  listaOpcion,
  listaOrden,
  listaPagina,
  listaTamano,
} from "@/lib/lista-params";
import { OrdenesTable } from "./ordenes-table";
import { OrdenesLive } from "./ordenes-live";

export const metadata: Metadata = { title: "Órdenes" };

const GRUPOS_ORDEN = ["activas", "terminadas", "canceladas"] as const;
const SORTS_ORDEN = ["orden", "creada", "entrega", "total", "doctor"] as const;

async function OrdenesList({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    grupo?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  const { q, page: pageParam, size: sizeParam, grupo, sort, order } =
    await searchParams;
  const page = listaPagina(pageParam);
  const size = listaTamano(sizeParam);
  const filtros = {
    grupo: listaOpcion(grupo, GRUPOS_ORDEN),
    sort: listaOpcion(sort, SORTS_ORDEN),
    order: listaOrden(order),
  };
  // The search runs on the server (patient names are encrypted at rest).
  const ordenes = await listOrdenesPage(q, page, size, filtros);
  return (
    <OrdenesTable
      ordenes={ordenes.data}
      total={ordenes.total}
      page={page}
      size={size}
      busquedaInicial={q ?? ""}
      filtros={filtros}
    />
  );
}

export default function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; size?: string }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <OrdenesLive />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Órdenes</h1>
        <Link href="/ordenes/nuevo" className={buttonVariants()}>
          <Plus aria-hidden className="size-4" /> Nueva orden
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <OrdenesList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
