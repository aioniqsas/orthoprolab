import { Suspense } from "react";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import { listClinicas } from "@/lib/data/repository";
import { CLINICAS_REASON, DisabledAction } from "../../_components/disabled-action";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { SampleNotice } from "../../_components/sample-notice";
import { ClinicasTable } from "./clinicas-table";

export const metadata: Metadata = { title: "Clínicas" };

export default function ClinicasPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Directorio de clínicas odontológicas"
        description="Clínicas registradas y los doctores asociados a cada una."
        actions={
          <DisabledAction id="nueva-clinica-reason" variant="default" reason={CLINICAS_REASON}>
            <Plus aria-hidden /> Registrar clínica
          </DisabledAction>
        }
      />
      <SampleNotice section="clínicas" />
      <Suspense fallback={<ListSkeleton />}>
        <ClinicasView />
      </Suspense>
    </section>
  );
}

async function ClinicasView() {
  if (!(await isAdmin())) return null;
  const clinicas = await listClinicas();
  return <ClinicasTable clinicas={clinicas} />;
}
