import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getOrden } from "@/lib/data/repository";
import { OrdenesLive } from "../ordenes-live";
import { DevolverOrdenForm } from "../devolver-orden-form";
import { ConfirmarSatisfaccionForm } from "../confirmar-satisfaccion-form";
import { OrdenDetallesTable } from "../detalles-table";

export const metadata: Metadata = { title: "Orden" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default async function OrdenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orden = await getOrden(id);
  if (!orden) notFound();

  const doctor = orden.asignacion?.doctor;
  const paciente = orden.asignacion?.paciente;
  const total = Number(orden.valor).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

  return (
    <section className="flex flex-col gap-6 max-w-3xl">
      <OrdenesLive />
      <div className="flex flex-col gap-1">
        <Link
          href="/ordenes"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" aria-hidden /> Órdenes
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Orden #{orden.id}</h1>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: orden.estado.color ?? "#6b7280" }}
          >
            {orden.estado.nombre}
          </span>
          {orden.urgente && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              Urgente
            </span>
          )}
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card p-5 grid gap-4 sm:grid-cols-2">
        {doctor && (
          <Field
            label="Doctor"
            value={`${doctor.apellidos}, ${doctor.nombres}`}
          />
        )}
        {paciente && <Field label="Paciente" value={paciente.nombre} />}
        <Field
          label="Fecha de creación"
          value={new Date(orden.fechaCreacion).toLocaleDateString("es-CO")}
        />
        {orden.fechaEntrega && (
          <Field
            label="Fecha de entrega"
            value={new Date(orden.fechaEntrega).toLocaleDateString("es-CO")}
          />
        )}
      </div>

      {/* Historial de estados */}
      {orden.historial && orden.historial.length > 0 && (
        <section aria-labelledby="historial" className="rounded-xl border border-border bg-card p-5">
          <h2 id="historial" className="font-heading text-lg font-semibold">Historial de estados</h2>
          <ol className="mt-4 flex flex-col gap-4 border-s border-border ps-4">
            {orden.historial
              .filter((h) => !h.estadoAnterior || h.estadoAnterior.id !== h.estadoNuevo.id)
              .map((h) => (
              <li key={h.id} className="relative">
                <span aria-hidden className="absolute top-1.5 -start-[1.3rem] size-2 rounded-full bg-primary" />
                <p className="text-sm font-medium">
                  {h.estadoAnterior
                    ? `Pasó de "${h.estadoAnterior.nombre}" a "${h.estadoNuevo.nombre}"`
                    : `Se creó con estado "${h.estadoNuevo.nombre}"`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(h.fechaCambio).toLocaleString("es-CO")}
                </p>
                {h.observaciones ? (
                  <p className="mt-1 text-xs text-muted-foreground">Motivo: {h.observaciones}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Detalles */}
      {orden.detalles.length > 0 && (
        <div className="flex flex-col gap-3">
          <OrdenDetallesTable detalles={orden.detalles} />
          {Number(orden.valor) > 0 && (
            <div className="flex justify-end">
              <span className="text-sm font-semibold">Total: {total}</span>
            </div>
          )}
        </div>
      )}
      {(orden.estado.codigo === "en_entrega" || orden.estado.nombre === "En entrega al cliente") && (
        <>
          <ConfirmarSatisfaccionForm ordenId={orden.id} />
          <DevolverOrdenForm ordenId={orden.id} />
        </>
      )}
    </section>
  );
}
