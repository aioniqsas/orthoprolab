import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../common/list-query.js';

/**
 * `/mi-clinica/pacientes`: search and page window. No `sort`: the patient name
 * and cedula are encrypted at rest, so the database cannot order by them.
 */
export class ListPacientesQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  doctorId?: string;
}
