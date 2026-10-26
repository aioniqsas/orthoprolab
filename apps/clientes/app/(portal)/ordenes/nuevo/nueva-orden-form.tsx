"use client";
import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import type { Doctor, Servicio } from "@/lib/data/types";
import { crearOrden } from "./actions";
import { PacienteCedulaField } from "./_components/paciente-cedula-field";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-full";
const selectCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-full";

interface Detalle {
  servicioId: string;
  servicioNombre: string;
  cantidad: number;
  observaciones: string;
}

interface Props {
  doctores: Doctor[];
  servicios: Servicio[];
}

export function NuevaOrdenForm({ doctores, servicios }: Props) {
  const [state, formAction, isPending] = useActionState(crearOrden, null);

  const [doctorId, setDoctorId] = useState("");
  const [detalles, setDetalles] = useState<Detalle[]>([
    { servicioId: "", servicioNombre: "", cantidad: 1, observaciones: "" },
  ]);

  function addDetalle() {
    setDetalles((prev) => [
      ...prev,
      { servicioId: "", servicioNombre: "", cantidad: 1, observaciones: "" },
    ]);
  }

  function removeDetalle(i: number) {
    setDetalles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateDetalle(i: number, field: keyof Detalle, value: string | number) {
    setDetalles((prev) =>
      prev.map((d, idx) => {
        if (idx !== i) return d;
        if (field === "servicioId") {
          const srv = servicios.find((s) => s.id === value);
          return { ...d, servicioId: String(value), servicioNombre: srv?.nombre ?? "" };
        }
        return { ...d, [field]: value };
      }),
    );
  }

  const detallesPayload = detalles
    .filter((d) => d.servicioId)
    .map((d) => ({
      servicioId: Number(d.servicioId),
      cantidad: d.cantidad,
      ...(d.observaciones ? { observaciones: d.observaciones } : {}),
    }));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Doctor + Paciente */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Asignación</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="doctorId" className="text-sm font-medium text-body">
              Doctor <span aria-hidden className="text-destructive">*</span>
            </label>
            <select
              id="doctorId"
              name="doctorId"
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={selectCls}
            >
              <option value="">Seleccioná un doctor</option>
              {doctores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.apellidos}, {d.nombres}
                </option>
              ))}
            </select>
          </div>

          <PacienteCedulaField onFound={() => {}} onCleared={() => {}} />
        </div>
      </div>

      {/* Servicios */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-title">Servicios</h2>
          <Button type="button" variant="outline" size="sm" onClick={addDetalle}>
            <Plus className="size-4 mr-1" aria-hidden /> Agregar
          </Button>
        </div>

        {detalles.map((d, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_80px_auto] items-end border-t border-border pt-4 first:border-0 first:pt-0">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-body">
                Servicio <span aria-hidden className="text-destructive">*</span>
              </label>
              <select
                value={d.servicioId}
                onChange={(e) => updateDetalle(i, "servicioId", e.target.value)}
                className={selectCls}
                required
              >
                <option value="">Seleccioná un servicio</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Observaciones (opcional)"
                value={d.observaciones}
                onChange={(e) => updateDetalle(i, "observaciones", e.target.value)}
                className={inputCls + " mt-1"}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-body">Cantidad</label>
              <input
                type="number"
                min={1}
                max={99}
                value={d.cantidad}
                onChange={(e) => updateDetalle(i, "cantidad", Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => removeDetalle(i)}
              disabled={detalles.length === 1}
              className="mb-0.5 self-end p-2 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
              aria-label="Quitar línea"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        ))}

        {/* Hidden field carries the serialised detalles */}
        <input type="hidden" name="detalles" value={JSON.stringify(detallesPayload)} />
      </div>

      {/* Opciones */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-title">Opciones</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="fechaEntrega" className="text-sm font-medium text-body">
              Fecha de entrega
            </label>
            <input
              id="fechaEntrega"
              name="fechaEntrega"
              type="date"
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              id="urgente"
              name="urgente"
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
            />
            <label htmlFor="urgente" className="text-sm font-medium text-body">
              Orden urgente
            </label>
          </div>
        </div>
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin mr-1" aria-hidden /> : null}
          Crear orden
        </Button>
      </div>
    </form>
  );
}
