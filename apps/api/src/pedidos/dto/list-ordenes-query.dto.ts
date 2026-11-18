import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ListQueryDto, toBoolean } from '../../common/list-query.js';

export const ORDEN_SORT_COLUMNS = [
  'orden',
  'creada',
  'entrega',
  'total',
  'doctor',
] as const;

export const ORDEN_GROUPS = ['activas', 'terminadas', 'canceladas'] as const;
export type OrdenGroup = (typeof ORDEN_GROUPS)[number];

/** `/ordenes` and `/mi-clinica/ordenes`: search, state group, urgency and sort. */
export class ListOrdenesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(ORDEN_SORT_COLUMNS)
  sort?: (typeof ORDEN_SORT_COLUMNS)[number];

  @IsOptional()
  @IsIn(ORDEN_GROUPS)
  grupo?: OrdenGroup;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  urgente?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estadoId?: number;
}
