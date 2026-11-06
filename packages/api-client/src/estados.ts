/**
 * Los siete estados del catálogo `estado_orden`, agrupados como los portales
 * los filtran: tres grupos estables en lugar de siete opciones sueltas.
 */
export const GRUPOS_ORDEN = {
  activas: [
    "creada",
    "recibida",
    "en_proceso",
    "en_entrega",
    "devuelta_correccion",
  ],
  terminadas: ["terminada"],
  canceladas: ["cancelada"],
} as const;

export type GrupoOrden = keyof typeof GRUPOS_ORDEN;

const GRUPO_POR_ESTADO = new Map<string, GrupoOrden>(
  Object.entries(GRUPOS_ORDEN).flatMap(([grupo, estados]) =>
    estados.map((estado) => [estado, grupo as GrupoOrden] as const),
  ),
);

/** Grupo de un slug de `estado_orden`, o `null` si el slug es desconocido. */
export function grupoDeEstado(codigo: string | null | undefined): GrupoOrden | null {
  return codigo ? (GRUPO_POR_ESTADO.get(codigo) ?? null) : null;
}
