import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { listClinicas } from "@/lib/data/repository";
import { NuevoUsuarioForm } from "./nuevo-usuario-form";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuarioPage() {
  const clinicas = await listClinicas();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          href="/usuarios"
          className="inline-flex items-center gap-1 text-sm text-body hover:text-title mb-4"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a usuarios
        </Link>
        <PageHeader
          title="Nuevo usuario"
          description="Crea una cuenta de acceso al sistema."
        />
      </div>
      <NuevoUsuarioForm clinicas={clinicas} />
    </section>
  );
}
