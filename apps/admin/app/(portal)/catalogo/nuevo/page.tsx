import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import { PageHeader } from "../../../_components/page-header";
import { ServicioForm } from "../servicio-form";

export const metadata: Metadata = { title: "Nuevo servicio" };

export default async function NuevoServicioPage() {
  if (!(await isAdmin())) return null;

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver al catálogo
      </Link>
      <PageHeader
        title="Nuevo servicio"
        description="Se publica en el sitio web y se incluye en el PDF del catálogo."
      />
      <ServicioForm mode="create" />
    </section>
  );
}
