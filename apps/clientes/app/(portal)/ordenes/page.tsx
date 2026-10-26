import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { listOrdenes } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Órdenes" };

function estadoBadge(nombre: string, color: string | null) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color ?? "#6b7280" }}
    >
      {nombre}
    </span>
  );
}

async function OrdenesList() {
  const ordenes = await listOrdenes();

  if (ordenes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay órdenes registradas aún.</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {ordenes.map((o) => (
        <li key={o.id}>
          <Link
            href={`/ordenes/${o.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">Orden #{o.id}</p>
              {o.doctor ? (
                <p className="text-xs text-muted-foreground">
                  Dr. {o.doctor.apellidos}, {o.doctor.nombres}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {new Date(o.fechaCreacion).toLocaleDateString("es-CO")}
              </span>
              {estadoBadge(o.estado.nombre, o.estado.color)}
              {o.urgente ? (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive font-medium">
                  Urgente
                </span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function OrdenesPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Órdenes</h1>
        <Link href="/ordenes/nuevo" className={buttonVariants()}>
          <Plus aria-hidden className="size-4" /> Nueva orden
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <OrdenesList />
      </Suspense>
    </section>
  );
}
