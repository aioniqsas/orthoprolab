import { IsIn, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../common/list-query.js';

export const CUENTA_SORT_COLUMNS = [
  'numero',
  'fecha',
  'total',
  'estado',
  'clinica',
] as const;

export const CUENTA_GROUPS = ['pendientes', 'pagadas', 'canceladas'] as const;
export type CuentaGroup = (typeof CUENTA_GROUPS)[number];

/** `/cuentas-cobro` and `/mi-clinica/cuentas-cobro`: search, group and sort. */
export class ListCuentasQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(CUENTA_SORT_COLUMNS)
  sort?: (typeof CUENTA_SORT_COLUMNS)[number];

  @IsOptional()
  @IsIn(CUENTA_GROUPS)
  grupo?: CuentaGroup;

  @IsOptional()
  @IsString()
  doctorId?: string;
}
