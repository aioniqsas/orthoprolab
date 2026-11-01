import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth-guard";
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
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const orden = await getOrden(Number(id));
  if (!orden) notFound();
  if (orden.estado !== "creada") notFound();
  return <EditarOrdenForm orden={orden} />;
}
