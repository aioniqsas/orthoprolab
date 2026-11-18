"use client";

import { useActionState, useState, useEffect } from "react";
import { cambiarEstadoFila } from "./actions";

interface EstadoItem {
  id: string;
  codigo: string;
  nombre: string;
}

interface Props {
  ordenId: string;
  estadoActualCodigo: string;
  estados?: EstadoItem[];
}

export function EstadoFilaSelect({ ordenId, estadoActualCodigo, estados: estadosProp }: Props) {
  const [state, formAction, pending] = useActionState(cambiarEstadoFila, null);
  // Solo se piden al API si la fila no vino con la lista (fallback).
  const [fetchedEstados, setFetchedEstados] = useState<EstadoItem[] | null>(null);
  useEffect(() => {
    if (estadosProp && estadosProp.length > 0) return;
    fetch((typeof window !== "undefined" ? "/api-proxy" : "http://localhost:3003") + "/ordenes/estados", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFetchedEstados(Array.isArray(data) ? data : []))
      .catch(() => setFetchedEstados([]));
  }, [estadosProp]);
  // Estado derivado: la prop (revalidate/SSE) siempre gana sobre lo traído por fetch.
  const estados =
    estadosProp && estadosProp.length > 0 ? estadosProp : (fetchedEstados ?? []);

  const currentId = estados.find((e) => e.codigo === estadoActualCodigo)?.id ?? "";
  // Anular tiene su propia acción con motivo; la fila no la ofrece.
  const opciones = estados.filter((e) => e.codigo !== "cancelada");

  const [val, setVal] = useState(currentId);
  // Reset durante render (patrón "adjust state on prop change" de React):
  // cuando el estado real cambia, la selección vuelve a sincronizarse.
  const [prevCurrentId, setPrevCurrentId] = useState(currentId);
  if (currentId !== prevCurrentId) {
    setPrevCurrentId(currentId);
    setVal(currentId);
  }
  // Si el API rechaza el cambio, el selector vuelve al estado real.
  const seleccionado = state && !state.ok ? currentId : val;

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="ordenId" value={ordenId} />
      <select
        name="estadoId"
        value={seleccionado || currentId || ""}
        disabled={pending || opciones.length === 0}
        onChange={(e) => {
          setVal(e.target.value);
          const form = e.currentTarget.closest("form");
          if (form) form.requestSubmit();
        }}
        className="h-6 w-32 rounded bg-transparent border border-input px-1 py-0 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
      >
        {opciones.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>
      {state && !state.ok && (
        <p role="alert" className="text-[10px] text-destructive leading-none">{state.error}</p>
      )}
    </form>
  );
}
