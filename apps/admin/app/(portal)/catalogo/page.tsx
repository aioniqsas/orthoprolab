import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { listServiciosPage } from "@/lib/data/repository";
import {
  listaBooleano,
  listaOpcion,
  listaOrden,
  listaPagina,
  listaTamano,
} from "@/lib/lista-params";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { ServiciosTable } from "./servicios-table";

export const metadata: Metadata = { title: "Catálogo y aranceles" };

export default function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    activo?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo y aranceles"
        description="Servicios que ofrece el laboratorio y el precio de cada uno en pesos colombianos."
        actions={
          <>
            <Link
              href="/catalogo/pdf"
              className={buttonVariants({ variant: "outline" })}
            >
              <Eye aria-hidden /> Vista previa del PDF
            </Link>
            <Link href="/catalogo/nuevo" className={buttonVariants()}>
              <Plus aria-hidden /> Nuevo servicio
            </Link>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <CatalogoView searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const SORTS_SERVICIO = ["nombre", "precio", "activo", "creado"] as const;

async function CatalogoView({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    activo?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  const { q, page: pageParam, size: sizeParam, activo, sort, order } =
    await searchParams;
  if (!(await isAdmin())) return null;
  const page = listaPagina(pageParam);
  const size = listaTamano(sizeParam);
  const filtros = {
    activo: listaBooleano(activo),
    sort: listaOpcion(sort, SORTS_SERVICIO),
    order: listaOrden(order),
  };
  const servicios = await listServiciosPage(q, page, size, filtros);
  return (
    <ServiciosTable
      servicios={servicios.data}
      total={servicios.total}
      page={page}
      size={size}
      busquedaInicial={q ?? ""}
      filtros={filtros}
    />
  );
}
