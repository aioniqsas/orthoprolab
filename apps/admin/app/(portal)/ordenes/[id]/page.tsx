import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import {
  estadoLabel,
  formatCop,
  formatDate,
  formatDateTime,
  fullName,
  lineSubtotal,
  orderTotal,
} from "@/lib/data/helpers";
import { getOrden, listClinicas } from "@/lib/data/repository";
import { DisabledAction, ORDENES_REASON } from "../../../_components/disabled-action";
import { EstadoBadge, UrgenteBadge } from "../../../_components/estado-badge";
import { ListSkeleton } from "../../../_components/list-skeleton";
import { PageHeader } from "../../../_components/page-header";
import { SampleNotice } from "../../../_components/sample-notice";

export const metadata: Metadata = { title: "Detalle de orden" };

export default function OrdenDetailPage({ params }: PageProps<"/ordenes/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/ordenes"
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver a órdenes
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <OrdenDetail params={params} />
      </Suspense>
    </section>
  );
}

async function OrdenDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const orden = await getOrden(Number(id));
  if (!orden) notFound();
  const clinica = (await listClinicas()).find((c) => c.id === orden.doctor.clinicaId);
  const total = orderTotal(orden.detalles);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Orden #${orden.id}`}
        actions={
          <>
            <DisabledAction id="editar-orden-reason" reason={ORDENES_REASON}>
              Editar orden
            </DisabledAction>
            <DisabledAction id="cambiar-estado-reason" variant="default" reason={ORDENES_REASON}>
              Cambiar estado
            </DisabledAction>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <EstadoBadge estado={orden.estado} />
        {orden.urgente ? <UrgenteBadge /> : null}
      </div>
      <SampleNotice section="órdenes" />

      <dl className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Doctor", fullName(orden.doctor)],
          ["Clínica", clinica?.nombre ?? "Sin clínica"],
          ["Paciente", orden.paciente.nombre],
          ["Fecha de creación", formatDate(orden.fechaCreacion)],
          ["Fecha de entrega", formatDate(orden.fechaEntrega)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="detalles" className="rounded-xl border border-border bg-card p-5">
          <h2 id="detalles" className="font-heading text-lg font-semibold">
            Servicios
          </h2>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {orden.detalles.map((d) => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{d.servicio}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {d.cantidad} x {formatCop(d.precioUnitario)}
                  </p>
                  {d.observaciones ? (
                    <p className="mt-1 text-xs text-muted-foreground">{d.observaciones}</p>
                  ) : null}
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {formatCop(lineSubtotal(d.cantidad, d.precioUnitario))}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-center justify-between border-t border-border pt-4 font-heading text-lg font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCop(total)}</span>
          </p>
        </section>

        <section aria-labelledby="historial" className="rounded-xl border border-border bg-card p-5">
          <h2 id="historial" className="font-heading text-lg font-semibold">
            Historial de estados
          </h2>
          <ol className="mt-4 flex flex-col gap-4 border-s border-border ps-4">
            {orden.historial.map((h) => (
              <li key={h.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -start-[1.3rem] size-2 rounded-full bg-primary"
                />
                <p className="text-sm font-medium">
                  {h.estadoAnterior
                    ? `${estadoLabel(h.estadoAnterior)} a ${estadoLabel(h.estadoNuevo)}`
                    : estadoLabel(h.estadoNuevo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(h.fechaCambio)} - {h.usuario}
                </p>
                {h.observaciones ? (
                  <p className="mt-1 text-xs text-muted-foreground">{h.observaciones}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
