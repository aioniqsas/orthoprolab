import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { listServicios } from "@/lib/data/repository";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { ServiciosTable } from "./servicios-table";

export const metadata: Metadata = { title: "Catálogo y aranceles" };

export default function CatalogoPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo y aranceles"
        description="Servicios que ofrece el laboratorio y el precio de cada uno en pesos colombianos."
        actions={
          <>
            <Link
              href="/catalogo/pdf"
              className={buttonVariants({ variant: "outline" })}
            >
              <Eye aria-hidden /> Vista previa del PDF
            </Link>
            <Link href="/catalogo/nuevo" className={buttonVariants()}>
              <Plus aria-hidden /> Nuevo servicio
            </Link>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <CatalogoView />
      </Suspense>
    </section>
  );
}

async function CatalogoView() {
  if (!(await isAdmin())) return null;
  const servicios = await listServicios();
  return <ServiciosTable servicios={servicios} />;
}
