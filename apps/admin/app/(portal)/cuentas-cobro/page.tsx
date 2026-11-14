import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { listCuentasCobroPage } from "@/lib/data/repository";
import {
  listaOpcion,
  listaOrden,
  listaPagina,
  listaTamano,
} from "@/lib/lista-params";
import { CuentasTable } from "./cuentas-table";
import { CuentasLive } from "./cuentas-live";

export const metadata: Metadata = { title: "Cuentas de cobro" };

const GRUPOS_CUENTA = ["pendientes", "pagadas", "canceladas"] as const;
const SORTS_CUENTA = ["numero", "fecha", "total", "estado", "clinica"] as const;

async function CuentasList({
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
  const {
    q,
    page: pageParam,
    size: sizeParam,
    grupo,
    sort,
    order,
  } = await searchParams;
  const page = listaPagina(pageParam);
  const size = listaTamano(sizeParam);
  const filtros = {
    grupo: listaOpcion(grupo, GRUPOS_CUENTA),
    sort: listaOpcion(sort, SORTS_CUENTA),
    order: listaOrden(order),
  };
  const cuentas = await listCuentasCobroPage(q, page, size, filtros);
  return (
    <CuentasTable
      cuentas={cuentas.data}
      total={cuentas.total}
      page={page}
      size={size}
      busquedaInicial={q ?? ""}
      filtros={filtros}
    />
  );
}

export default function CuentasCobroPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; size?: string }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Cuentas de cobro"
        description="Gestiona las cuentas de cobro de los doctores."
        actions={
          <Link href="/cuentas-cobro/nueva" className={buttonVariants()}>
            <Plus aria-hidden /> Nueva cuenta
          </Link>
        }
      />
      <CuentasLive />
      <Suspense fallback={<ListSkeleton />}>
        <CuentasList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
