import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { OrdersView } from "./orders-view";
import { OrdenesLive } from "./ordenes-live";

export const metadata: Metadata = { title: "Órdenes" };

export default function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    grupo?: string;
    urgente?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <OrdenesLive />
      <PageHeader
        title="Gestión de órdenes de laboratorio"
        description="Consulta el estado de las órdenes recibidas de las clínicas."
        actions={
          <Link href="/ordenes/nueva" className={buttonVariants()}>
            <Plus aria-hidden /> Nueva orden
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <OrdersView searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
