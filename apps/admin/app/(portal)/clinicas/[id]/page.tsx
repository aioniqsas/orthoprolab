import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import { fullName } from "@/lib/data/helpers";
import { getClinica } from "@/lib/data/repository";
import { CLINICAS_REASON, DisabledAction } from "../../../_components/disabled-action";
import { ListSkeleton } from "../../../_components/list-skeleton";
import { PageHeader } from "../../../_components/page-header";
import { SampleNotice } from "../../../_components/sample-notice";

export const metadata: Metadata = { title: "Detalle de clínica" };

export default function ClinicaDetailPage({ params }: PageProps<"/clinicas/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/clinicas"
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver a clínicas
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <ClinicaDetail params={params} />
      </Suspense>
    </section>
  );
}

async function ClinicaDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const clinica = await getClinica(Number(id));
  if (!clinica) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={clinica.nombre}
        description={clinica.direccion ?? "Sin dirección registrada"}
        actions={
          <>
            <DisabledAction id="editar-clinica-reason" reason={CLINICAS_REASON}>
              Editar
            </DisabledAction>
            <DisabledAction id="eliminar-clinica-reason" variant="destructive" reason={CLINICAS_REASON}>
              Eliminar
            </DisabledAction>
          </>
        }
      />
      <SampleNotice section="clínicas" />
      <section aria-labelledby="doctores" className="rounded-xl border border-border bg-card p-5">
        <h2 id="doctores" className="font-heading text-lg font-semibold">
          Doctores ({clinica.doctores.length})
        </h2>
        {clinica.doctores.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Esta clínica no tiene doctores asociados.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {clinica.doctores.map((d) => (
              <li key={d.id} className="py-3">
                <p className="text-sm font-medium">{fullName(d)}</p>
                <p className="text-xs text-muted-foreground">{d.correo}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
