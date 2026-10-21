import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { formatCop } from "@/lib/data/helpers";
import { getServicio } from "@/lib/data/repository";
import { ListSkeleton } from "../../../_components/list-skeleton";
import { PageHeader } from "../../../_components/page-header";
import { ActivoBadge } from "../../../_components/status-badges";
import { PrecioHistoricoNote } from "../aranceles-info";
import { ServicioAcciones } from "../servicio-acciones";
import { ServicioImagenForm } from "../servicio-imagen-form";

export const metadata: Metadata = { title: "Detalle de servicio" };

export default function ServicioDetailPage({ params }: PageProps<"/catalogo/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver al catálogo
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <ServicioDetail params={params} />
      </Suspense>
    </section>
  );
}

async function ServicioDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!/^[1-9]\d{0,17}$/.test(id)) notFound();
  const servicio = await getServicio(id);
  if (!servicio) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={servicio.nombre}
        description={servicio.descripcion ?? "Sin descripción"}
        actions={
          <>
            <Link href={`/catalogo/${servicio.id}/editar`} className={buttonVariants({ variant: "outline" })}>
              Editar
            </Link>
            <ServicioAcciones id={servicio.id} activo={servicio.activo} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="arancel" className="rounded-xl border border-border bg-card p-5">
          <h2 id="arancel" className="font-heading text-lg font-semibold">
            Arancel
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Precio vigente (COP)</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatCop(servicio.precio)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estado</dt>
              <dd className="mt-1">
                <ActivoBadge activo={servicio.activo} />
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <PrecioHistoricoNote />
          </div>
        </section>

        <section aria-labelledby="imagen" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <h2 id="imagen" className="font-heading text-lg font-semibold">
            Imagen
          </h2>
          {servicio.imagenUrl ? (
            <Image
              src={servicio.imagenUrl}
              alt={servicio.nombre}
              width={320}
              height={320}
              className="h-40 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
              <ImageIcon aria-hidden className="size-6" />
              <span className="sr-only">Sin imagen</span>
            </div>
          )}
          <ServicioImagenForm id={servicio.id} />
        </section>
      </div>
    </div>
  );
}
