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
  const [estados, setEstados] = useState<EstadoItem[]>(estadosProp ?? []);

  // Fallback: fetch if not provided (e.g. client-side usage).
  useEffect(() => {
    if (estadosProp && estadosProp.length > 0) {
      setEstados(estadosProp);
      return;
    }
    fetch((typeof window !== "undefined" ? "/api-proxy" : "http://localhost:3003") + "/ordenes/estados", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEstados(Array.isArray(data) ? data : []))
      .catch(() => setEstados([]));
  }, [estadosProp]);

  // Keep in sync if the prop changes (revalidate/SSE).
  useEffect(() => {
    if (estadosProp && estadosProp.length > 0) setEstados(estadosProp);
  }, [estadosProp]);

  const currentId = estados.find((e) => e.codigo === estadoActualCodigo)?.id ?? "";

  const [val, setVal] = useState(currentId);
  useEffect(() => { setVal(currentId); }, [estadoActualCodigo, currentId, estados]);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="ordenId" value={ordenId} />
      <select
        name="estadoId"
        value={val || currentId || ""}
        disabled={pending || estados.length === 0}
        onChange={(e) => {
          setVal(e.target.value);
          const form = e.currentTarget.closest("form");
          if (form) form.requestSubmit();
        }}
        className="h-6 w-32 rounded bg-transparent border border-input px-1 py-0 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
      >
        {estados.map((e) => (
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
