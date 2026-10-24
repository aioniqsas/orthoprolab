import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { listCuentasCobro } from "@/lib/data/repository";
import { CuentasTable } from "./cuentas-table";

export const metadata: Metadata = { title: "Cuentas de cobro" };

async function CuentasList() {
  const all = await listCuentasCobro();
  const cuentas = all.filter((c) => c.estado !== "borrador");
  return <CuentasTable cuentas={cuentas} />;
}

export default function CuentasCobroPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Cuentas de cobro"
        description="Gestiona las cuentas de cobro emitidas a los doctores."
        actions={
          <Link href="/cuentas-cobro/nueva" className={buttonVariants()}>
            <Plus aria-hidden /> Nueva cuenta
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <CuentasList />
      </Suspense>
    </section>
  );
}
