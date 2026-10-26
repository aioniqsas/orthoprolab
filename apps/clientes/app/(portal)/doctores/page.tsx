import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { listDoctores } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Mis doctores" };

async function DoctoresList() {
  const doctores = await listDoctores(true);

  if (doctores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay doctores registrados aún.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {doctores.map((d) => (
        <li key={d.id}>
          <Link
            href={`/doctores/${d.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">
                {d.apellidos}, {d.nombres}
              </p>
              {d.correo ? (
                <p className="text-xs text-muted-foreground">{d.correo}</p>
              ) : null}
            </div>
            {!d.activo ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Inactivo
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DoctoresPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis doctores</h1>
        <Link href="/doctores/nuevo" className={buttonVariants()}>
          <Plus aria-hidden className="size-4" /> Nuevo doctor
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <DoctoresList />
      </Suspense>
    </section>
  );
}
