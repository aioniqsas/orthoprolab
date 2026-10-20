import { Info } from "lucide-react";
import { SAMPLE_DATA } from "@/lib/data/repository";

/** Visible notice shown on every screen backed by the sample data layer. */
export function SampleNotice({ section }: { section: string }) {
  if (!SAMPLE_DATA) return null;
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>
        <strong className="font-medium text-foreground">Datos de ejemplo.</strong> El backend de{" "}
        {section} todavía no está conectado: los registros mostrados son ficticios.
      </span>
    </p>
  );
}
