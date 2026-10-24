import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { listClinicas } from "@/lib/data/repository";
import { NuevaCuentaForm } from "./nueva-cuenta-form";

export const metadata: Metadata = { title: "Nueva cuenta de cobro" };

export default async function NuevaCuentaPage() {
  const clinicas = await listClinicas();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          href="/cuentas-cobro"
          className="inline-flex items-center gap-1 text-sm text-body hover:text-title mb-4"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a cuentas de cobro
        </Link>
        <PageHeader
          title="Nueva cuenta de cobro"
          description="Crea una cuenta de cobro para una clínica."
        />
      </div>
      <NuevaCuentaForm clinicas={clinicas} />
    </section>
  );
}
