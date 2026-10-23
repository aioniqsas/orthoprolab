"use client";

import Link from "next/link";
import { DataTable } from "@repo/ui/components/data-table";
import type { DataTableColumn } from "@repo/ui/components/data-table";
import { fullName } from "@/lib/data/helpers";
import type { Clinica } from "@/lib/data/types";

const columns: DataTableColumn<Clinica>[] = [
  {
    id: "clinica",
    header: "Clínica",
    sortValue: (c) => c.nombre,
    render: (c) => (
      <Link
        href={`/clinicas/${c.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {c.nombre}
      </Link>
    ),
    searchValue: (c) => c.nombre,
  },
  {
    id: "direccion",
    header: "Dirección",
    render: (c) => c.direccion ?? "Sin dirección",
    searchValue: (c) => c.direccion ?? "",
  },
  {
    id: "doctores",
    header: "Doctores",
    align: "right",
    sortValue: (c) => c.doctores.length,
    render: (c) => c.doctores.length,
    // La búsqueda por nombre de doctor vive en esta columna.
    searchValue: (c) => c.doctores.map((d) => fullName(d)).join(" "),
  },
];

export function ClinicasTable({ clinicas }: { clinicas: Clinica[] }) {
  return (
    <DataTable
      rows={clinicas}
      columns={columns}
      rowKey={(c) => String(c.id)}
      search={{
        placeholder: "Buscar por clínica, dirección o doctor",
        label: "Buscar por clínica, dirección o doctor",
      }}
      renderCard={(c) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <Link
            href={`/clinicas/${c.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {c.nombre}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{c.direccion ?? "Sin dirección"}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {c.doctores.length === 1 ? "1 doctor" : `${c.doctores.length} doctores`}
          </p>
        </li>
      )}
      empty={
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay clínicas con esta búsqueda</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba con otro término.</p>
        </div>
      }
    />
  );
}
