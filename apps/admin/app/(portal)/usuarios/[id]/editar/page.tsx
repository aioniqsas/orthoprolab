import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import { fullName } from "@/lib/data/helpers";
import { getUsuario } from "@/lib/data/repository";
import { ListSkeleton } from "../../../../_components/list-skeleton";
import { PageHeader } from "../../../../_components/page-header";
import { EditarUsuarioForm } from "./editar-usuario-form";

export const metadata: Metadata = { title: "Editar usuario" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <Link
        href=".."
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver al usuario
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <EditarUsuarioContent params={params} />
      </Suspense>
    </section>
  );
}

async function EditarUsuarioContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const usuario = await getUsuario(id);
  if (!usuario) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar: ${fullName(usuario)}`} />
      <EditarUsuarioForm usuario={usuario} />
    </div>
  );
}
