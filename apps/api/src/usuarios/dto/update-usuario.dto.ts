import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  nombres?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  apellidos?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // null = remove clinic; undefined = not provided (no change); number = set to that clinic
  @IsOptional()
  @ValidateIf((o: UpdateUsuarioDto) => o.clinicaId !== null)
  @IsInt()
  @Min(1)
  clinicaId?: number | null;
}
