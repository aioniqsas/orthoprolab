import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getOrden } from "@/lib/data/repository";
import { EditarOrdenForm } from "./editar-orden-form";

export default function EditarOrdenPage({ params }: PageProps<"/ordenes/[id]/editar">) {
  return (
    <Suspense fallback={null}>
      <EditarOrden params={params} />
    </Suspense>
  );
}

async function EditarOrden({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orden = await getOrden(id);
  if (!orden) notFound();
  if (orden.estado?.codigo !== "creada" && orden.estado?.nombre !== "Creada") notFound();
  return <EditarOrdenForm orden={orden} />;
}
