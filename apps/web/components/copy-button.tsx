"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { RADIUS } from "@/lib/ui";

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
      onClick={copy}
      aria-label={`Copiar ${label}`}
      className={cn(
        "min-h-11 h-auto gap-2 border-highlight px-4 text-[15px] font-semibold",
        RADIUS,
        state === "copied"
          ? "bg-highlight text-surface hover:bg-highlight"
          : "bg-transparent text-highlight hover:bg-highlight/10 hover:text-highlight",
      )}
    >
      {state === "copied" ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      {state === "copied" ? "Copiado" : state === "failed" ? "No se pudo copiar" : "Copiar número"}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? `${label} copiado al portapapeles` : ""}
      </span>
    </Button>
  );
}
