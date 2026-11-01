"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@repo/ui/action-button";
import { Button } from "@repo/ui/components/button";
import { Odontograma } from "@repo/ui/odontograma";
import { Section } from "@repo/ui/section";
import type { Orden } from "@/lib/data/types";
import { API_URL } from "@/lib/api";

type Linea = {
  id?: number;
  servicio: string;
  cantidad: number;
  dientes: number[];
  colorDiente: string;
  observaciones?: string;
};

export function EditarOrdenForm({ orden }: { orden: Orden }) {
  const router = useRouter();
  const [urgente, setUrgente] = useState(orden.urgente);
  const [fechaEntrega, setFechaEntrega] = useState(orden.fechaEntrega ?? "");
  const [lineas, setLineas] = useState<Linea[]>(
    orden.detalles.map((d) => ({
      id: d.id,
      servicio: d.servicio,
      cantidad: d.cantidad,
      dientes: d.dientes ?? [],
      colorDiente: d.colorDiente ?? "",
      observaciones: d.observaciones ?? "",
    })),
  );
  const [activa, setActiva] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizar(i: number, patch: Partial<Linea>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function agregar() {
    setLineas((prev) => [...prev, { servicio: "", cantidad: 1, dientes: [], colorDiente: "", observaciones: "" }]);
    setActiva(lineas.length);
  }

  function quitar(i: number) {
    if (lineas.length === 1) return;
    setLineas((prev) => prev.filter((_, idx) => idx !== i));
    setActiva((a) => Math.min(a, lineas.length - 2));
  }

  async function guardar() {
    setPending(true);
    setError(null);
    try {
      const detalles = lineas.map((l) => ({
        servicio: l.servicio.trim(),
        cantidad: Number(l.cantidad) || 1,
        dientes: l.dientes,
        colorDiente: l.colorDiente.trim(),
        observaciones: l.observaciones?.trim() || undefined,
      }));
      const res = await fetch(`${API_URL}/ordenes/${orden.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detalles,
          urgente,
          fechaEntrega: fechaEntrega || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as { message?: string | string[] }).message;
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg || "No se pudo guardar");
      }
      router.push(`/ordenes/${orden.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  }

  const l = lineas[activa];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar orden #{orden.id}</h1>
        <div className="flex gap-2">
          <ActionButton intent="outline" onClick={() => router.back()}>
            Cancelar
          </ActionButton>
          <ActionButton onClick={guardar} disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </ActionButton>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Section className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
          Urgente
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fecha de entrega
          <input
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1"
          />
        </label>
      </Section>

      <Section>
        <div className="flex flex-wrap gap-2">
          {lineas.map((linea, i) => (
            <button
              key={i}
              onClick={() => setActiva(i)}
              className={`rounded-lg px-3 py-1 text-sm ${activa === i ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Trabajo {i + 1}
            </button>
          ))}
          <ActionButton intent="ghost" onClick={agregar}>
            + Añadir trabajo
          </ActionButton>
        </div>

        {l ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-3">
              <input
                value={l.servicio}
                onChange={(e) => actualizar(activa, { servicio: e.target.value })}
                placeholder="Clase de trabajo (texto libre)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  min={1}
                  value={l.cantidad}
                  onChange={(e) => actualizar(activa, { cantidad: Number(e.target.value) })}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={l.colorDiente}
                  onChange={(e) => actualizar(activa, { colorDiente: e.target.value })}
                  placeholder="Color de diente"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={l.observaciones ?? ""}
                onChange={(e) => actualizar(activa, { observaciones: e.target.value })}
                placeholder="Observaciones"
                className="min-h-16 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {lineas.length > 1 ? (
                <ActionButton intent="ghost" onClick={() => quitar(activa)}>
                  Quitar este trabajo
                </ActionButton>
              ) : null}
            </div>
            <Odontograma
              idPrefix={`edit-${orden.id}-${activa}`}
              dientes={l.dientes}
              color={l.colorDiente}
              onDientesChange={(dientes) => actualizar(activa, { dientes })}
              onColorChange={(colorDiente) => actualizar(activa, { colorDiente })}
            />
          </div>
        ) : null}
      </Section>
    </div>
  );
}
