import { IsIn, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../common/list-query.js';

export const CLINICA_SORT_COLUMNS = ['nombre', 'creado'] as const;

/** `/clinicas`: search and sort. */
export class ListClinicasQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(CLINICA_SORT_COLUMNS)
  sort?: (typeof CLINICA_SORT_COLUMNS)[number];
}
