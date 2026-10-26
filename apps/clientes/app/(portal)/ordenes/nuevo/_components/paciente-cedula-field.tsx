"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  onFound(paciente: { id: string; nombre: string }): void;
  onCleared(): void;
}

type Status = "idle" | "searching" | "found" | "new";

export function PacienteCedulaField({ onFound, onCleared }: Props) {
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [foundId, setFoundId] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef<Status>("idle");

  // Keep callbacks in refs so they never become stale dependencies
  const onFoundRef = useRef(onFound);
  const onClearedRef = useRef(onCleared);
  onFoundRef.current = onFound;
  onClearedRef.current = onCleared;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!cedula.trim()) {
        setStatus("idle");
        setNombre("");
        setFoundId("");
        prevStatusRef.current = "idle";
        onClearedRef.current();
        return;
      }

      setStatus("searching");
      fetch(`/api/pacientes/buscar?cedula=${encodeURIComponent(cedula.trim())}`)
        .then(async (res) => {
          if (res.ok) {
            const data = (await res.json()) as { id: string; nombre: string };
            setFoundId(data.id);
            setNombre(data.nombre);
            setStatus("found");
            prevStatusRef.current = "found";
            onFoundRef.current(data);
          } else {
            setFoundId("");
            // Only clear the name if we previously had a found patient autofilled
            if (prevStatusRef.current === "found") setNombre("");
            setStatus("new");
            prevStatusRef.current = "new";
            onClearedRef.current();
          }
        })
        .catch(() => {
          setFoundId("");
          if (prevStatusRef.current === "found") setNombre("");
          setStatus("new");
          prevStatusRef.current = "new";
          onClearedRef.current();
        });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cedula]); // cedula is the only real dependency

  const inputCls =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight w-full";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="pacienteCedula" className="text-sm font-medium text-body">
          Cédula del paciente <span aria-hidden className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            id="pacienteCedula"
            name="pacienteCedula"
            type="text"
            placeholder="Cédula del paciente"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className={inputCls}
            autoComplete="off"
          />
          {status === "searching" && (
            <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pacienteNombre" className="text-sm font-medium text-body">
          Nombre del paciente <span aria-hidden className="text-destructive">*</span>
        </label>
        <input
          id="pacienteNombre"
          name="pacienteNombre"
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          readOnly={status === "found"}
          className={inputCls + (status === "found" ? " bg-muted/50" : "")}
        />
        {status === "found" && (
          <span className="text-xs text-green-600 font-medium">Paciente existente</span>
        )}
        {status === "new" && cedula.trim() && (
          <span className="text-xs text-amber-600 font-medium">
            Paciente nuevo — se creará al guardar
          </span>
        )}
      </div>

      {/* Hidden field: set when patient is found, empty when new */}
      <input
        type="hidden"
        name="pacienteId"
        value={status === "found" ? foundId : ""}
      />
    </div>
  );
}
