"use client";
import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Odontograma } from "@repo/ui/components/odontograma";
import type { Diente } from "@repo/api-client";
import type { Doctor, Servicio } from "@/lib/data/types";
import { crearOrden } from "./actions";
import { PacienteCedulaField } from "./_components/paciente-cedula-field";

const fieldCls =
  "rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full transition-colors";

interface Detalle {
  servicioId: string;
  servicioNombre: string;
  cantidad: number;
  dientes: Diente[];
  observaciones: string;
}

interface Props {
  doctores: Doctor[];
  servicios: Servicio[];
}

function SectionLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ring-1 ring-primary/30">
        {number}
      </span>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 h-px bg-border" aria-hidden />
    </div>
  );
}

export function NuevaOrdenForm({ doctores, servicios }: Props) {
  const [state, formAction, isPending] = useActionState(crearOrden, null);

  const [doctorId, setDoctorId] = useState("");
  const [detalles, setDetalles] = useState<Detalle[]>([]);

  function addDetalle() {
    setDetalles((prev) => [
      ...prev,
      { servicioId: "", servicioNombre: "", cantidad: 1, dientes: [], observaciones: "" },
    ]);
  }

  function removeDetalle(i: number) {
    setDetalles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateDetalle(
    i: number,
    field: keyof Detalle,
    value: Detalle[keyof Detalle],
  ) {
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
      dientes: d.dientes,
      ...(d.observaciones ? { observaciones: d.observaciones } : {}),
    }));

  const total = detalles.reduce((acc, d) => {
    const srv = servicios.find((s) => s.id === d.servicioId);
    return acc + (srv ? Number(srv.precio) * d.cantidad : 0);
  }, 0);

  const totalFmt =
    total > 0
      ? total.toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        })
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-0">

      {/* ── Block 1: Asignación ── */}
      <div className="rounded-t-2xl border border-border bg-card px-6 pt-6 pb-7">
        <SectionLabel number={1} label="Asignación" />

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Doctor */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doctorId" className="text-sm font-medium text-foreground">
              Doctor <span aria-hidden className="text-destructive">*</span>
            </label>
            <select
              id="doctorId"
              name="doctorId"
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={fieldCls}
            >
              <option value="">Seleccioná un doctor</option>
              {doctores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.apellidos}, {d.nombres}
                </option>
              ))}
            </select>
            {doctorId === "" && (
              <p className="text-xs text-muted-foreground">
                El doctor se asigna a la orden y al paciente.
              </p>
            )}
          </div>

          {/* Paciente */}
          <div>
            <PacienteCedulaField onFound={() => {}} onCleared={() => {}} />
          </div>
        </div>
      </div>

      {/* Divider arrow */}
      <div className="flex justify-center border-x border-border bg-card py-0">
        <div className="flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground -my-0.5 relative z-10">
          <ChevronRight className="size-3.5 rotate-90" aria-hidden />
        </div>
      </div>

      {/* ── Block 2: Clases de trabajo ── */}
      <div className="border-x border-border bg-card px-6 pt-5 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ring-1 ring-primary/30">
              2
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Clases de trabajo
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDetalle} className="h-8 text-xs gap-1.5">
            <Plus className="size-3.5" aria-hidden /> Agregar
          </Button>
        </div>

        {detalles.length === 0 ? (
          <button
            type="button"
            onClick={addDetalle}
            className="w-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-muted-foreground hover:border-primary/40 hover:text-primary/70 hover:bg-primary/5 transition-colors"
          >
            <Plus className="size-5" aria-hidden />
            <span className="text-sm">Agregar primera clase de trabajo</span>
          </button>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {detalles.map((d, i) => {
              const srvInfo = servicios.find((s) => s.id === d.servicioId);
              const lineTotal =
                srvInfo && Number(srvInfo.precio) > 0
                  ? (Number(srvInfo.precio) * d.cantidad).toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    })
                  : null;

              return (
                <div key={i} className="py-4 first:pt-0 last:pb-0">
                  {/* Top row: service select + qty + delete */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <select
                        value={d.servicioId}
                        onChange={(e) => updateDetalle(i, "servicioId", e.target.value)}
                        className={fieldCls}
                        required
                        aria-label={`Clase de trabajo ${i + 1}`}
                      >
                        <option value="">Seleccioná una clase de trabajo</option>
                        {servicios.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty stepper */}
                    <div className="flex items-center shrink-0 h-9 rounded-lg border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateDetalle(i, "cantidad", Math.max(1, d.cantidad - 1))}
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-medium transition-colors"
                        aria-label="Reducir"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-semibold text-foreground select-none">
                        {d.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDetalle(i, "cantidad", Math.min(99, d.cantidad + 1))}
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-medium transition-colors"
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDetalle(i)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Quitar"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>

                  {/* Meta row: price hint + line total */}
                  {srvInfo && (
                    <div className="mt-1.5 flex items-center justify-between px-0.5">
                      <span className="text-xs text-muted-foreground">
                        {Number(srvInfo.precio) > 0
                          ? `${Number(srvInfo.precio).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })} c/u`
                          : "Sin precio"}
                      </span>
                      {lineTotal && (
                        <span className="text-xs font-medium text-foreground">{lineTotal}</span>
                      )}
                    </div>
                  )}

                  {/* Observaciones */}
                  <textarea
                    placeholder="Observaciones (opcional)"
                    value={d.observaciones}
                    onChange={(e) => updateDetalle(i, "observaciones", e.target.value)}
                    rows={1}
                    className="mt-2 rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full resize-none transition-colors"
                  />

                  {/* Dientes del trabajo */}
                  <div className="mt-3 rounded-lg border border-border bg-input/40 p-3">
                    <Odontograma
                      idPrefix={`detalle_${i}`}
                      value={d.dientes}
                      onChange={(dientes) => updateDetalle(i, "dientes", dientes)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <input type="hidden" name="detalles" value={JSON.stringify(detallesPayload)} />
      </div>

      {/* Divider arrow */}
      <div className="flex justify-center border-x border-border bg-card py-0">
        <div className="flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground -my-0.5 relative z-10">
          <ChevronRight className="size-3.5 rotate-90" aria-hidden />
        </div>
      </div>

      {/* ── Block 3: Opciones + Submit ── */}
      <div className="rounded-b-2xl border border-border bg-card px-6 pt-5 pb-6">
        <SectionLabel number={3} label="Entrega" />

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex flex-col gap-1.5 sm:w-56">
            <label htmlFor="fechaEntrega" className="text-sm font-medium text-foreground">
              Fecha de entrega
            </label>
            <input
              id="fechaEntrega"
              name="fechaEntrega"
              type="date"
              className={fieldCls}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer sm:mb-2">
            <input
              id="urgente"
              name="urgente"
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">Orden urgente</span>
          </label>
        </div>

        {/* Error */}
        {state && !state.ok && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {state.error}
          </div>
        )}

        {/* Submit row */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-border">
          {totalFmt ? (
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">Total estimado</span>
              <span className="text-base font-semibold text-foreground">{totalFmt}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Agregá clases de trabajo para ver el total</span>
          )}

          <Button type="submit" disabled={isPending} className="min-w-32">
            {isPending ? (
              <><Loader2 className="size-4 animate-spin mr-1.5" aria-hidden />Creando…</>
            ) : (
              "Crear orden"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
