import type { OrdenGroup } from './dto/list-ordenes-query.dto.js';

/**
 * Order states grouped the way the portals filter them. Kept in sync with
 * `GRUPOS_ORDEN` in `@repo/api-client`, which renders the same groups.
 */
export const ESTADOS_POR_GRUPO: Record<OrdenGroup, string[]> = {
  activas: [
    'creada',
    'recibida',
    'en_proceso',
    'en_entrega',
    'devuelta_correccion',
  ],
  terminadas: ['terminada'],
  canceladas: ['cancelada'],
};

/** Whitelisted `sort` keys of `/ordenes`, mapped to their SQL column. */
export const ORDEN_ORDER_COLUMNS: Record<string, string> = {
  orden: 'o.id',
  creada: 'o.fechaCreacion',
  entrega: 'o.fechaEntrega',
  total: 'o.valor',
  doctor: 'doctor.apellidos',
};
