import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CambiarEstadoDto {
  @IsInt()
  @Min(1)
  estadoId!: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  observaciones?: string;
}
