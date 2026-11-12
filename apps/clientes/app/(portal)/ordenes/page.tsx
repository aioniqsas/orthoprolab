import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { listOrdenes } from "@/lib/data/repository";
import { OrdenesTable } from "./ordenes-table";
import { OrdenesLive } from "./ordenes-live";

export const metadata: Metadata = { title: "Órdenes" };

async function OrdenesList({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  // The search runs on the server (patient names are encrypted at rest).
  const ordenes = await listOrdenes(q);
  return <OrdenesTable ordenes={ordenes} busquedaInicial={q ?? ""} />;
}

export default function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <OrdenesLive />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Órdenes</h1>
        <Link href="/ordenes/nuevo" className={buttonVariants()}>
          <Plus aria-hidden className="size-4" /> Nueva orden
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <OrdenesList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
