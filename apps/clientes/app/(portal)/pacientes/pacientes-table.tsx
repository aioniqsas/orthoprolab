"use client";

import Link from "next/link";
import { DataTable } from "@repo/ui/components/data-table";
import type { PacienteConCedula } from "@/lib/data/types";

export function PacientesTable({ pacientes }: { pacientes: PacienteConCedula[] }) {
  return (
    <DataTable
      rows={pacientes}
      rowKey={(p) => p.id}
      columns={[
        {
          id: "nombre",
          header: "Nombre",
          render: (p) => <span className="text-title">{p.nombre}</span>,
          searchValue: (p) => p.nombre,
          sortValue: (p) => p.nombre,
        },
        {
          id: "cedula",
          header: "Cédula",
          render: (p) => <span className="font-mono">{p.cedula ?? "—"}</span>,
          searchValue: (p) => p.cedula ?? "",
          sortValue: (p) => p.cedula ?? "",
        },
        {
          id: "acciones",
          header: "",
          align: "right",
          render: (p) => (
            <Link href={`/pacientes/${p.id}`} className="text-highlight text-xs hover:underline">
              Ver / editar
            </Link>
          ),
        },
      ]}
      search={{ placeholder: "Buscar paciente", label: "Buscar paciente" }}
      renderCard={(p) => (
        <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col">
            <span className="text-title">{p.nombre}</span>
            <span className="font-mono text-xs text-muted-foreground">{p.cedula ?? "—"}</span>
          </div>
          <Link href={`/pacientes/${p.id}`} className="text-highlight text-xs hover:underline">
            Ver / editar
          </Link>
        </li>
      )}
      empty={<p className="text-sm text-body">No hay pacientes registrados.</p>}
    />
  );
}
