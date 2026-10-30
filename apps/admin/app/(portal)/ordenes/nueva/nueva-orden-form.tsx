"use client";
import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import type { Diente } from "@/lib/dientes";
import type { DoctorOpcion, Servicio } from "@/lib/data/types";
import { crearOrden } from "./actions";
import { PacienteCedulaField } from "./_components/paciente-cedula-field";
import { Odontograma } from "./_components/odontograma";

interface Props {
  doctores: DoctorOpcion[];
  servicios: Servicio[];
}

interface DetalleRow {
  servicioId: string;
  cantidad: number;
  dientes: Diente[];
}

export function NuevaOrdenForm({ doctores, servicios }: Props) {
  const [state, formAction, isPending] = useActionState(crearOrden, null);

  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [detalles, setDetalles] = useState<DetalleRow[]>([
    { servicioId: "", cantidad: 1, dientes: [] },
  ]);

  function addDetalle() {
    setDetalles((prev) => [...prev, { servicioId: "", cantidad: 1, dientes: [] }]);
  }

  function removeDetalle(index: number) {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDetalle(
    index: number,
    field: keyof DetalleRow,
    value: DetalleRow[keyof DetalleRow],
  ) {
    setDetalles((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Doctor */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Doctor</h2>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="doctorId"
            className="text-sm font-medium text-body"
          >
            Doctor responsable <span className="text-destructive">*</span>
          </label>
          <select
            id="doctorId"
            name="doctorId"
            required
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
          >
            <option value="">Selecciona un doctor</option>
            {doctores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.apellidos}, {d.nombres} — {d.correo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Paciente */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Paciente</h2>
        <PacienteCedulaField onFound={() => {}} onCleared={() => {}} />
      </div>

      {/* Clases de trabajo */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Clases de trabajo</h2>

        {detalles.map((row, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label
                  htmlFor={`servicioId_${i}`}
                  className="text-sm font-medium text-body"
                >
                  Clase de trabajo <span className="text-destructive">*</span>
                </label>
                <select
                  id={`servicioId_${i}`}
                  name={`servicioId_${i}`}
                  required
                  value={row.servicioId}
                  onChange={(e) => updateDetalle(i, "servicioId", e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                >
                  <option value="">Selecciona una clase de trabajo</option>
                  {servicios
                    .filter((s) => s.activo)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} — ${Number(s.precio).toLocaleString("es-CO")}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label
                  htmlFor={`cantidad_${i}`}
                  className="text-sm font-medium text-body"
                >
                  Cantidad
                </label>
                <input
                  id={`cantidad_${i}`}
                  name={`cantidad_${i}`}
                  type="number"
                  min={1}
                  max={99}
                  required
                  value={row.cantidad}
                  onChange={(e) =>
                    updateDetalle(i, "cantidad", Number(e.target.value))
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                />
              </div>
              {detalles.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDetalle(i)}
                  aria-label="Eliminar fila"
                  className="mb-0.5"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>

            <Odontograma
              idPrefix={`detalle_${i}`}
              value={row.dientes}
              onChange={(dientes) => updateDetalle(i, "dientes", dientes)}
            />
            <input type="hidden" name={`dientes_${i}`} value={JSON.stringify(row.dientes)} />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addDetalle}
          className="self-start"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden />
          Agregar clase de trabajo
        </Button>
      </div>

      {/* Opciones adicionales */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Opciones</h2>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="fechaEntrega"
            className="text-sm font-medium text-body"
          >
            Fecha de entrega
          </label>
          <input
            id="fechaEntrega"
            name="fechaEntrega"
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="urgente"
            name="urgente"
            type="checkbox"
            className="rounded border-border"
          />
          <label htmlFor="urgente" className="text-sm font-medium text-body">
            Marcar como urgente
          </label>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
          Crear orden
        </Button>
      </div>
    </form>
  );
}
