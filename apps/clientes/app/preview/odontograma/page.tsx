"use client";

import { useState } from "react";
import { Odontograma } from "@repo/ui/components/odontograma";

/**
 * Dev-only harness for the Playwright layout check (e2e/odontograma.spec.ts).
 * Not reachable in production: the proxy only exposes /preview outside prod.
 */
export default function PreviewOdontogramaPage() {
  const [dientes, setDientes] = useState<number[]>([11, 21, 36]);
  const [color, setColor] = useState("A2");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">Preview del odontograma</h1>
      <div className="rounded-xl border border-border bg-card p-4">
        <Odontograma
          idPrefix="preview"
          dientes={dientes}
          color={color}
          onDientesChange={setDientes}
          onColorChange={setColor}
        />
      </div>
    </main>
  );
}
