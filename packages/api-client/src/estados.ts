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

/**
 * Los cinco estados de `cuenta_cobro` agrupados como los portales los filtran.
 * Un borrador todavía no se emitió y un pago parcial todavía debe dinero: los
 * dos son trabajo pendiente, no plata cobrada.
 */
export const GRUPOS_CUENTA = {
  pendientes: ["borrador", "emitida", "pagada_parcial"],
  pagadas: ["pagada"],
  canceladas: ["anulada"],
} as const;

export type GrupoCuenta = keyof typeof GRUPOS_CUENTA;

/** Etiquetas visibles, en el orden en que se muestran. */
export const GRUPO_CUENTA_LABELS: Record<GrupoCuenta, string> = {
  pendientes: "Pendientes",
  pagadas: "Pagadas",
  canceladas: "Canceladas",
};

const GRUPO_POR_ESTADO_CUENTA = new Map<string, GrupoCuenta>(
  Object.entries(GRUPOS_CUENTA).flatMap(([grupo, estados]) =>
    estados.map((estado) => [estado, grupo as GrupoCuenta] as const),
  ),
);

/** Grupo de un estado de cuenta de cobro, o `null` si es desconocido. */
export function grupoDeCuenta(estado: string | null | undefined): GrupoCuenta | null {
  return estado ? (GRUPO_POR_ESTADO_CUENTA.get(estado) ?? null) : null;
}
