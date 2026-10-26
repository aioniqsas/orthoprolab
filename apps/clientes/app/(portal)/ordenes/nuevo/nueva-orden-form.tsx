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

function StepHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shrink-0">
        {number}
      </span>
      <h2 className="font-heading font-semibold text-title">{title}</h2>
    </div>
  );
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

  const hasEmptyDetalles =
    detalles.length === 1 && detalles[0]!.servicioId === "";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* ── Step 1: Asignación ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <StepHeader number={1} title="Asignación" />

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

          <div>
            <PacienteCedulaField onFound={() => {}} onCleared={() => {}} />
          </div>
        </div>
      </div>

      {/* ── Step 2: Servicios ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shrink-0">
              2
            </span>
            <h2 className="font-heading font-semibold text-title">Servicios</h2>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDetalle}>
            <Plus className="size-4 mr-1" aria-hidden /> Agregar servicio
          </Button>
        </div>

        {hasEmptyDetalles ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Plus className="size-8 opacity-30" aria-hidden />
            <p className="text-sm">Aún no hay servicios. Usá "Agregar servicio" para empezar.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {detalles.map((d, i) => {
              const srvInfo = servicios.find((s) => s.id === d.servicioId);
              return (
                <div
                  key={i}
                  className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-start border-t border-border pt-4 first:border-0 first:pt-0 mt-4 first:mt-0"
                >
                  {/* Service selector + observaciones */}
                  <div className="flex flex-col gap-2">
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
                            {Number(s.precio) > 0
                              ? ` — ${Number(s.precio).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })}`
                              : ""}
                          </option>
                        ))}
                      </select>
                      {srvInfo && Number(srvInfo.precio) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Precio unitario:{" "}
                          {Number(srvInfo.precio).toLocaleString("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          })}
                        </p>
                      )}
                    </div>
                    <textarea
                      placeholder="Observaciones (opcional)"
                      value={d.observaciones}
                      onChange={(e) => updateDetalle(i, "observaciones", e.target.value)}
                      rows={2}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-full resize-none"
                    />
                  </div>

                  {/* Quantity +/- */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-body">Cantidad</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateDetalle(i, "cantidad", Math.max(1, d.cantidad - 1))}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-sm font-bold hover:bg-muted transition-colors"
                        aria-label="Reducir cantidad"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{d.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => updateDetalle(i, "cantidad", Math.min(99, d.cantidad + 1))}
                        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-sm font-bold hover:bg-muted transition-colors"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-transparent select-none" aria-hidden>.</span>
                    <button
                      type="button"
                      onClick={() => removeDetalle(i)}
                      disabled={detalles.length === 1}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors"
                      aria-label="Quitar línea"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hidden field carries the serialised detalles */}
        <input type="hidden" name="detalles" value={JSON.stringify(detallesPayload)} />
      </div>

      {/* ── Step 3: Opciones ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <StepHeader number={3} title="Opciones" />
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {totalFmt && (
          <p className="text-sm text-muted-foreground sm:mr-auto">
            Total estimado:{" "}
            <span className="font-semibold text-foreground">{totalFmt}</span>
          </p>
        )}
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? <Loader2 className="size-4 animate-spin mr-1" aria-hidden /> : null}
          Crear orden
        </Button>
      </div>
    </form>
  );
}
