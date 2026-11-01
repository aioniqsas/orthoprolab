"use client";
import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import { Odontograma } from "@repo/ui/components/odontograma";
import type { DoctorOpcion } from "@/lib/data/types";
import { crearOrden } from "./actions";
import { PacienteCedulaField } from "./_components/paciente-cedula-field";

interface Props {
  doctores: DoctorOpcion[];
}

interface DetalleRow {
  servicio: string;
  cantidad: number;
  dientes: number[];
  color: string;
}

export function NuevaOrdenForm({ doctores }: Props) {
  const [state, formAction, isPending] = useActionState(crearOrden, null);

  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [detalles, setDetalles] = useState<DetalleRow[]>([
    { servicio: "", cantidad: 1, dientes: [], color: "" },
  ]);

  function addDetalle() {
    setDetalles((prev) => [...prev, { servicio: "", cantidad: 1, dientes: [], color: "" }]);
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
                  htmlFor={`servicio_${i}`}
                  className="text-sm font-medium text-body"
                >
                  Clase de trabajo <span className="text-destructive">*</span>
                </label>
                <input
                  id={`servicio_${i}`}
                  name={`servicio_${i}`}
                  required
                  maxLength={120}
                  placeholder="Ej. Corona de zirconia"
                  value={row.servicio}
                  onChange={(e) => updateDetalle(i, "servicio", e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                />
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
                <ActionButton intent="ghost"
                  type="button"
                  
                  size="icon"
                  onClick={() => removeDetalle(i)}
                  aria-label="Eliminar fila"
                  className="mb-0.5"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </ActionButton>
              )}
            </div>

            <Odontograma
              idPrefix={`detalle_${i}`}
              dientes={row.dientes}
              color={row.color}
              onDientesChange={(dientes) => updateDetalle(i, "dientes", dientes)}
              onColorChange={(color) => updateDetalle(i, "color", color)}
            />
            <input type="hidden" name={`dientes_${i}`} value={JSON.stringify(row.dientes)} />
            <input type="hidden" name={`color_${i}`} value={row.color} />
          </div>
        ))}

        <ActionButton intent="outline"
          type="button"
          
          onClick={addDetalle}
          className="self-start"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden />
          Agregar clase de trabajo
        </ActionButton>
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
        <ActionButton type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
          Crear orden
        </ActionButton>
      </div>
    </form>
  );
}
