import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import { getClinica } from "@/lib/data/repository";
import { ListSkeleton } from "../../../../_components/list-skeleton";
import { PageHeader } from "../../../../_components/page-header";
import { EditarClinicaForm } from "./editar-clinica-form";
export const metadata: Metadata = { title: "Editar clínica" };

export default function EditarClinicaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <section className="flex flex-col gap-6">
      <Link
        href=".."
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver a la clínica
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <EditarClinicaContent params={params} />
      </Suspense>
    </section>
  );
}

async function EditarClinicaContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const clinica = await getClinica(Number(id));
  if (!clinica) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar: ${clinica.nombre}`} />
      <EditarClinicaForm clinica={clinica} />
    </div>
  );
}
