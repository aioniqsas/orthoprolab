"use client";
import { useRef, useState } from "react";
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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef<Status>("idle");
  const onFoundRef = useRef(onFound);
  const onClearedRef = useRef(onCleared);
  onFoundRef.current = onFound;
  onClearedRef.current = onCleared;

  function handleCedulaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setCedula(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      setStatus("idle");
      setNombre("");
      setFoundId("");
      prevStatusRef.current = "idle";
      onClearedRef.current();
      return;
    }

    timerRef.current = setTimeout(() => {
      setStatus("searching");
      fetch(`/api/pacientes/buscar?cedula=${encodeURIComponent(value.trim())}`)
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
  }

  const inputCls =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="pacienteCedula" className="text-sm font-medium text-body">
          Cédula del paciente <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <input
            id="pacienteCedula"
            name="pacienteCedula"
            type="text"
            placeholder="Cédula del paciente"
            value={cedula}
            onChange={handleCedulaChange}
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
          Nombre del paciente <span className="text-destructive">*</span>
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
