import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaciente } from "@/lib/data/repository";
import { EditPacienteForm } from "./edit-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PacienteDetailPage({ params }: Props) {
  const { id } = await params;
  const paciente = await getPaciente(id);
  if (!paciente) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div className="flex items-center gap-3">
        <Link href="/pacientes" className="text-sm text-highlight hover:underline">
          ← Pacientes
        </Link>
        <h1 className="text-xl font-bold text-title">Detalle del paciente</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        {paciente.cedula && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-body uppercase tracking-wide">Cédula</span>
            <span className="font-mono text-sm text-title">{paciente.cedula}</span>
          </div>
        )}

        <EditPacienteForm id={paciente.id} nombre={paciente.nombre} />
      </div>
    </div>
  );
}
