"use client";

import { DataTable } from "@repo/ui/components/data-table";
import type { DetalleOrden } from "@/lib/data/types";

export function OrdenDetallesTable({ detalles }: { detalles: DetalleOrden[] }) {
  return (
    <DataTable
      rows={detalles}
      rowKey={(d) => d.id}
      columns={[
        {
          id: "servicio",
          header: "Clase de trabajo",
          render: (d) => (
            <div className="flex flex-col">
              <span>{d.servicio}</span>
              {d.observaciones && (
                <span className="text-xs text-muted-foreground">{d.observaciones}</span>
              )}
            </div>
          ),
          searchValue: (d) => `${d.servicio} ${d.observaciones ?? ""}`,
          sortValue: (d) => d.servicio,
        },
        {
          id: "dientes",
          header: "Dientes",
          render: (d) =>
            d.dientes?.length ? (
              <span className="text-xs">{d.dientes.join(", ")}</span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
          searchValue: (d) => (d.dientes ?? []).join(" "),
        },
        {
          id: "color",
          header: "Color",
          render: (d) =>
            d.colorDiente ? (
              <span className="text-xs">{d.colorDiente}</span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
          searchValue: (d) => d.colorDiente ?? "",
        },
        {
          id: "cantidad",
          header: "Cant.",
          align: "right",
          render: (d) => d.cantidad,
          sortValue: (d) => d.cantidad,
        },

      ]}
      renderCard={(d) => (
        <li className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium">{d.servicio}</span>
            <span className="text-xs text-muted-foreground tabular-nums">Cant. {d.cantidad}</span>
          </div>
          {d.observaciones && (
            <p className="mt-1 text-xs text-muted-foreground">{d.observaciones}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>Dientes: {d.dientes?.length ? d.dientes.join(", ") : "—"}</span>
            <span>Color: {d.colorDiente ? d.colorDiente : "—"}</span>
          </div>
        </li>
      )}
      empty={<p className="text-sm text-muted-foreground">Sin detalles.</p>}
    />
  );
}
