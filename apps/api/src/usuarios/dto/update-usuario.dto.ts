import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => String(value).toLowerCase().trim())
  @IsEmail()
  correo?: string;

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
