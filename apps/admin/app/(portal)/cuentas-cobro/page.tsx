import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { listCuentasCobro } from "@/lib/data/repository";
import { CuentasTable } from "./cuentas-table";
import { CuentasLive } from "./cuentas-live";

export const metadata: Metadata = { title: "Cuentas de cobro" };

async function CuentasList({ searchParams }: { searchParams: Promise<{ q?: string }>; }) {
  const { q } = await searchParams;
  const cuentas = await listCuentasCobro(q);
  return <CuentasTable cuentas={cuentas} busquedaInicial={q ?? ""} />;
}

export default function CuentasCobroPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
