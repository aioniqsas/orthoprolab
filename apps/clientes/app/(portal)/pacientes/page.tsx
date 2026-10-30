import Link from "next/link";
import { listPacientes } from "@/lib/data/repository";
import { PacientesTable } from "./pacientes-table";

export default async function PacientesPage() {
  const pacientes = await listPacientes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-title">Pacientes</h1>
        <Link
          href="/pacientes/nuevo"
          className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Nuevo paciente
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
