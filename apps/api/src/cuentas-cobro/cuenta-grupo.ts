import type { CuentaGroup } from './dto/list-cuentas-query.dto.js';

/**
 * Billing-account states grouped the way the portals filter them. Kept in sync
 * with `GRUPOS_CUENTA` in `@repo/api-client`.
 */
export const ESTADOS_POR_GRUPO_CUENTA: Record<CuentaGroup, string[]> = {
  pendientes: ['borrador', 'emitida', 'pagada_parcial'],
  pagadas: ['pagada'],
  canceladas: ['anulada'],
};

/** Whitelisted `sort` keys of `/cuentas-cobro`, mapped to their SQL column. */
export const CUENTA_ORDER_COLUMNS: Record<string, string> = {
  numero: 'cc.numero',
  fecha: 'cc.createdAt',
  total: 'cc.total',
  estado: 'cc.estado',
  clinica: 'clinica.nombre',
};
