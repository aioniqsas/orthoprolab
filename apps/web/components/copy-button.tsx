"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@repo/ui/components/button";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={`Copiar ${label}`}
    >
      {state === "copied" ? (
        <CheckIcon aria-hidden />
      ) : (
        <CopyIcon aria-hidden />
      )}
      {state === "copied" ? "Copiado" : state === "failed" ? "No se pudo copiar" : "Copiar"}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? `${label} copiado al portapapeles` : ""}
      </span>
    </Button>
  );
}
