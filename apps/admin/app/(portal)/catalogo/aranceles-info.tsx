import { FileText } from "lucide-react";
import { DisabledAction, CATALOGO_REASON } from "../../_components/disabled-action";

/** Explains how prices work. Text follows `apps/api/docs/database-model.md`. */
export function PrecioHistoricoNote() {
  return (
    <p className="text-sm text-muted-foreground">
      El precio de cada línea de una orden (<code className="font-mono text-xs">detalle_orden.precio_unitario</code>)
      se copia del precio del servicio cuando se crea la línea, por eso un cambio posterior de
      tarifa nunca altera las órdenes anteriores.
    </p>
  );
}

export function ArancelesPanel() {
  return (
    <section aria-labelledby="aranceles" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 id="aranceles" className="font-heading text-lg font-semibold">
          Aranceles
        </h2>
        <div className="mt-1">
          <PrecioHistoricoNote />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
        <div className="flex items-start gap-3">
          <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Catálogo público en PDF</p>
            <p className="text-sm text-muted-foreground">
              El sitio público publica el archivo <code className="font-mono text-xs">/catalogo-orthopro-lab.pdf</code>{" "}
              para que las clínicas consulten los precios.
            </p>
          </div>
        </div>
        <DisabledAction id="subir-pdf-reason" reason={CATALOGO_REASON}>
          Subir nueva versión
        </DisabledAction>
      </div>
      <div className="flex flex-wrap gap-2">
        <DisabledAction id="cambiar-precios-reason" variant="default" reason={CATALOGO_REASON}>
          Actualizar aranceles
        </DisabledAction>
      </div>
    </section>
  );
}
