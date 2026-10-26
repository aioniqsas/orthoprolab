import Link from "next/link";
import { listPacientes } from "@/lib/data/repository";

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
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-4 py-3 text-left font-medium text-body">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-body">Cédula</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-title">{p.nombre}</td>
                  <td className="px-4 py-3 text-body font-mono">{p.cedula ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="text-highlight text-xs hover:underline"
                    >
                      Ver / editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
