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
