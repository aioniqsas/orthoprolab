import { IsIn, IsOptional } from 'class-validator';
import { ActivoQueryDto } from '../../common/list-query.js';

export const USUARIO_SORT_COLUMNS = [
  'nombre',
  'correo',
  'rol',
  'activo',
  'creado',
] as const;

/** `/usuarios`: search, active flag and sort. */
export class ListUsuariosQueryDto extends ActivoQueryDto {
  @IsOptional()
  @IsIn(USUARIO_SORT_COLUMNS)
  sort?: (typeof USUARIO_SORT_COLUMNS)[number];
}
