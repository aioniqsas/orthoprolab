import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import { formatCop } from "@/lib/data/helpers";
import { getServicio } from "@/lib/data/repository";
import { CATALOGO_REASON, DisabledAction } from "../../../_components/disabled-action";
import { ListSkeleton } from "../../../_components/list-skeleton";
import { PageHeader } from "../../../_components/page-header";
import { SampleNotice } from "../../../_components/sample-notice";
import { ActivoBadge } from "../../../_components/status-badges";
import { PrecioHistoricoNote } from "../aranceles-info";

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
  if (!/^\d{1,9}$/.test(id)) notFound();
  const servicio = await getServicio(Number(id));
  if (!servicio) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={servicio.nombre}
        description={servicio.descripcion ?? "Sin descripción"}
        actions={
          <>
            <DisabledAction id="editar-servicio-reason" reason={CATALOGO_REASON}>
              Editar
            </DisabledAction>
            <DisabledAction id="cambiar-precio-reason" variant="default" reason={CATALOGO_REASON}>
              Cambiar precio
            </DisabledAction>
          </>
        }
      />
      <SampleNotice section="catálogo" />
      <section aria-labelledby="arancel" className="rounded-xl border border-border bg-card p-5">
        <h2 id="arancel" className="font-heading text-lg font-semibold">
          Arancel
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Precio vigente (COP, dato ficticio)</dt>
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
    </div>
  );
}
