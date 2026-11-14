import { IsIn, IsOptional } from 'class-validator';
import { ActivoQueryDto } from '../../common/list-query.js';

export const SERVICIO_SORT_COLUMNS = [
  'nombre',
  'precio',
  'activo',
  'creado',
] as const;

/** `/admin/catalogo/servicios`: search, active flag and sort. */
export class ListServiciosQueryDto extends ActivoQueryDto {
  @IsOptional()
  @IsIn(SERVICIO_SORT_COLUMNS)
  sort?: (typeof SERVICIO_SORT_COLUMNS)[number];
}
