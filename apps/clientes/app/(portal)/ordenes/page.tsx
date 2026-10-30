import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { listOrdenes } from "@/lib/data/repository";
import { OrdenesTable } from "./ordenes-table";
import { OrdenesLive } from "./ordenes-live";

export const metadata: Metadata = { title: "Órdenes" };

async function OrdenesList() {
  const ordenes = await listOrdenes();
  return <OrdenesTable ordenes={ordenes} />;
}

export default function OrdenesPage() {
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
        <OrdenesList />
      </Suspense>
    </section>
  );
}
