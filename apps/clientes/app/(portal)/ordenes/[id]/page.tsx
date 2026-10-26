import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getOrden } from "@/lib/data/repository";

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

      {/* Detalles table */}
      {orden.detalles.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Servicio</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Cant.</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">P. unitario</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orden.detalles.map((d) => {
                const subtotal = (Number(d.precioUnitario) * d.cantidad).toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                });
                const pu = Number(d.precioUnitario).toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                });
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-3">
                      <p>{d.servicio.nombre}</p>
                      {d.observaciones && (
                        <p className="text-xs text-muted-foreground">{d.observaciones}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{d.cantidad}</td>
                    <td className="px-4 py-3 text-right">{pu}</td>
                    <td className="px-4 py-3 text-right font-medium">{subtotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total</td>
                <td className="px-4 py-3 text-right font-semibold">{total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
