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
          header: "Servicio",
          render: (d) => (
            <div className="flex flex-col">
              <span>{d.servicio.nombre}</span>
              {d.observaciones && (
                <span className="text-xs text-muted-foreground">{d.observaciones}</span>
              )}
            </div>
          ),
          searchValue: (d) => `${d.servicio.nombre} ${d.observaciones ?? ""}`,
          sortValue: (d) => d.servicio.nombre,
        },
        {
          id: "dientes",
          header: "Dientes",
          render: (d) =>
            d.dientes?.length ? (
              <span className="text-xs">
                {d.dientes.map((diente) => `${diente.numero} (${diente.color})`).join(", ")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            ),
          searchValue: (d) =>
            (d.dientes ?? []).map((diente) => `${diente.numero} ${diente.color}`).join(" "),
        },
        {
          id: "cantidad",
          header: "Cant.",
          align: "right",
          render: (d) => d.cantidad,
          sortValue: (d) => d.cantidad,
        },
        {
          id: "precio",
          header: "P. unitario",
          align: "right",
          render: (d) =>
            Number(d.precioUnitario).toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }),
          sortValue: (d) => Number(d.precioUnitario),
        },
        {
          id: "subtotal",
          header: "Subtotal",
          align: "right",
          render: (d) =>
            (Number(d.precioUnitario) * d.cantidad).toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }),
          sortValue: (d) => Number(d.precioUnitario) * d.cantidad,
        },
      ]}
      empty={<p className="text-sm text-muted-foreground">Sin detalles.</p>}
    />
  );
}
