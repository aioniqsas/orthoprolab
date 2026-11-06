import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { Odontograma } from "@repo/ui/odontograma";
import { formatearFecha, formatearFechaHora } from "@repo/api-client";
import { FullWidthStack, Section } from "@repo/ui/section";
import { getOrden } from "@/lib/data/repository";
import { OrdenesLive } from "../ordenes-live";
import { DevolverOrdenForm } from "../devolver-orden-form";
import { ConfirmarSatisfaccionForm } from "../confirmar-satisfaccion-form";
import { OrdenDetallesTable } from "../detalles-table";
import { AccionesOrden } from "./acciones-orden";

export const metadata: Metadata = { title: "Orden" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function OrdenPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <OrdenDetalle params={params} />
    </Suspense>
  );
}

async function OrdenDetalle({ params }: { params: Promise<{ id: string }> }) {
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
  // Una orden cancelada o terminada no vuelve a otro estado.
  const estadoFinal = ["cancelada", "terminada"].includes(orden.estado.codigo ?? "");

  return (
    <FullWidthStack>
      <OrdenesLive />
      <div className="flex flex-col gap-1">
        <Link
          href="/ordenes"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" aria-hidden /> Órdenes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          {orden.estado.codigo === "terminada" ? (
            <a
              href={`/api-proxy/mi-clinica/ordenes/${orden.id}/control-trabajos`}
              download
              className={buttonVariants({ variant: "outline" })}
            >
              <Download aria-hidden className="size-4" /> Control de trabajos
            </a>
          ) : null}
          <AccionesOrden
            ordenId={String(orden.id)}
            puedeEditar={orden.estado?.codigo === "creada" || orden.estado?.nombre === "Creada"}
            puedeCancelar={!estadoFinal}
          />
        </div>
      </div>

      {/* Summary card */}
      <Section as="div" className="grid gap-4 sm:grid-cols-2">
        {doctor && (
          <Field
            label="Doctor"
            value={`${doctor.apellidos}, ${doctor.nombres}`}
          />
        )}
        {paciente && <Field label="Paciente" value={paciente.nombre} />}
        <Field
          label="Fecha de creación"
          value={formatearFecha(orden.fechaCreacion, "—")}
        />
        {orden.fechaEntrega && (
          <Field
            label="Fecha de entrega"
            value={formatearFecha(orden.fechaEntrega, "—")}
          />
        )}
      </Section>

      {/* Historial de estados */}
      {orden.historial && orden.historial.length > 0 && (
        <Section aria-labelledby="historial">
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
                  {formatearFechaHora(h.fechaCambio)}
                </p>
                {h.observaciones ? (
                  <p className="mt-1 text-xs text-muted-foreground">Motivo: {h.observaciones}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Dientes a trabajar */}
      {orden.detalles.some((d) => d.dientes && d.dientes.length > 0) && (
        <Section aria-labelledby="odontograma-cliente">
          <h2 id="odontograma-cliente" className="font-heading text-lg font-semibold">
            Dientes a trabajar
          </h2>
          <div className="mt-4 flex flex-col gap-6">
            {orden.detalles.map((d) =>
              d.dientes && d.dientes.length > 0 ? (
                <div key={`odo-${d.id}`} className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{d.servicio}</p>
                  <Odontograma readOnly dientes={d.dientes} color={d.colorDiente ?? ""} />
                </div>
              ) : null,
            )}
          </div>
        </Section>
      )}

      {/* Detalles */}
      {orden.detalles.length > 0 && (
        <FullWidthStack className="gap-3">
          <OrdenDetallesTable detalles={orden.detalles} />
          {Number(orden.valor) > 0 && (
            <div className="flex justify-end">
              <span className="text-sm font-semibold">Total: {total}</span>
            </div>
          )}
        </FullWidthStack>
      )}
      {(orden.estado.codigo === "en_entrega" || orden.estado.nombre === "En entrega al cliente") && (
        <>
          <ConfirmarSatisfaccionForm ordenId={orden.id} />
          <DevolverOrdenForm ordenId={orden.id} />
        </>
      )}
    </FullWidthStack>
  );
}
