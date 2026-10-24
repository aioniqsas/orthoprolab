import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  nombres?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  apellidos?: string;

  @IsOptional()
  @IsEmail()
  correo?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  clinicaId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
