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
  // Only the fields the form edits cross into the client bundle: the rest of
  // the order (patient, history, billing) stays on the server.
  return (
    <EditarOrdenForm
      orden={{
        id: orden.id,
        urgente: orden.urgente,
        fechaEntrega: orden.fechaEntrega,
        detalles: orden.detalles,
      }}
    />
  );
}
