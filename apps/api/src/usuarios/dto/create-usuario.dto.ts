import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  nombres!: string;

  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  apellidos!: string;

  @Transform(({ value }: { value: unknown }) =>
    String(value as string)
      .toLowerCase()
      .trim(),
  )
  @IsEmail()
  correo!: string;

  @Matches(/^\d{5,12}$/)
  cedula!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password!: string;

  @IsIn(['administrador', 'clinica'])
  rol!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  clinicaId?: number;
}
