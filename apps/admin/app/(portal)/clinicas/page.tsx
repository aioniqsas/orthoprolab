import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { listClinicasPage } from "@/lib/data/repository";
import {
  listaOpcion,
  listaOrden,
  listaPagina,
  listaTamano,
} from "@/lib/lista-params";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { ClinicasTable } from "./clinicas-table";

export const metadata: Metadata = { title: "Clínicas" };

export default function ClinicasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Directorio de clínicas odontológicas"
        description="Clínicas registradas y los doctores asociados a cada una."
        actions={
          <Link href="/clinicas/nueva" className={buttonVariants()}>
            <Plus aria-hidden /> Registrar clínica
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <ClinicasView searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const SORTS_CLINICA = ["nombre", "creado"] as const;

async function ClinicasView({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  const { q, page: pageParam, size: sizeParam, sort, order } =
    await searchParams;
  if (!(await isAdmin())) return null;
  const page = listaPagina(pageParam);
  const size = listaTamano(sizeParam);
  const filtros = {
    sort: listaOpcion(sort, SORTS_CLINICA),
    order: listaOrden(order),
  };
  const clinicas = await listClinicasPage(q, page, size, filtros);
  return (
    <ClinicasTable
      clinicas={clinicas.data}
      total={clinicas.total}
      page={page}
      size={size}
      busquedaInicial={q ?? ""}
      filtros={filtros}
    />
  );
}
