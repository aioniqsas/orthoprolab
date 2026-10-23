import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { listDoctoresOrden } from "@/lib/data/repository";
import { listCatalogoServicios } from "@/lib/catalogo-api";
import { NuevaOrdenForm } from "./nueva-orden-form";

export const metadata: Metadata = { title: "Nueva orden" };

export default async function NuevaOrdenPage() {
  const [doctores, servicios] = await Promise.all([
    listDoctoresOrden(),
    listCatalogoServicios(),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          href="/ordenes"
          className="inline-flex items-center gap-1 text-sm text-body hover:text-title mb-4"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a órdenes
        </Link>
        <PageHeader
          title="Nueva orden"
          description="Crea una orden de laboratorio para un doctor y paciente."
        />
      </div>
      <NuevaOrdenForm doctores={doctores} servicios={servicios} />
    </section>
  );
}
