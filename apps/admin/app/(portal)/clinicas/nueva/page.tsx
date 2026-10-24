import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { NuevaClinicaForm } from "./nueva-clinica-form";

export const metadata: Metadata = { title: "Nueva clínica" };

export default function NuevaClinicaPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          href="/clinicas"
          className="inline-flex items-center gap-1 text-sm text-body hover:text-title mb-4"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a clínicas
        </Link>
        <PageHeader
          title="Registrar clínica"
          description="Crea una nueva clínica en el sistema."
        />
      </div>
      <NuevaClinicaForm />
    </section>
  );
}
