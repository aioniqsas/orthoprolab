import { Suspense } from "react";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { DisabledAction, ORDENES_REASON } from "../../_components/disabled-action";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { SampleNotice } from "../../_components/sample-notice";
import { OrdersView } from "./orders-view";

export const metadata: Metadata = { title: "Órdenes" };

export default function OrdenesPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Gestión de órdenes de laboratorio"
        description="Consulta el estado de las órdenes recibidas de las clínicas."
        actions={
          <DisabledAction id="nueva-orden-reason" variant="default" reason={ORDENES_REASON}>
            <Plus aria-hidden /> Nueva orden
          </DisabledAction>
        }
      />
      <SampleNotice section="órdenes" />
      <Suspense fallback={<ListSkeleton />}>
        <OrdersView />
      </Suspense>
    </section>
  );
}
