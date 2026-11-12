import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { listClinicas } from "@/lib/data/repository";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { ClinicasTable } from "./clinicas-table";

export const metadata: Metadata = { title: "Clínicas" };

export default function ClinicasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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

async function ClinicasView({ searchParams }: { searchParams: Promise<{ q?: string }>; }) {
  const { q } = await searchParams;
  if (!(await isAdmin())) return null;
  const clinicas = await listClinicas(q);
  return <ClinicasTable clinicas={clinicas} busquedaInicial={q ?? ""} />;
}
