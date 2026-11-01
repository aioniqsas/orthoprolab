import Link from "next/link";
import { ActionButton } from "@repo/ui/action-button";
import { listPacientes } from "@/lib/data/repository";
import { PacientesTable } from "./pacientes-table";

export default async function PacientesPage() {
  const pacientes = await listPacientes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-title">Pacientes</h1>
        <Link href="/pacientes/nuevo">
          <ActionButton>Nuevo paciente</ActionButton>
        </Link>
      </div>

      {pacientes.length === 0 ? (
        <p className="text-sm text-body">No hay pacientes registrados.</p>
      ) : (
        <PacientesTable pacientes={pacientes} />
      )}
    </div>
  );
}
