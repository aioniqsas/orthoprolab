import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth-guard";
import { getServicio } from "@/lib/data/repository";
import { PageHeader } from "../../../../_components/page-header";
import { ServicioForm } from "../../servicio-form";

export const metadata: Metadata = { title: "Editar servicio" };

export default async function EditarServicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!/^[1-9]\d{0,17}$/.test(id)) notFound();
  const servicio = await getServicio(id);
  if (!servicio) notFound();

  return (
    <section className="flex flex-col gap-6">
      <Link
        href={`/catalogo/${servicio.id}`}
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver al servicio
      </Link>
      <PageHeader title="Editar servicio" description={servicio.nombre} />
      <ServicioForm mode="edit" servicio={servicio} />
    </section>
  );
}
