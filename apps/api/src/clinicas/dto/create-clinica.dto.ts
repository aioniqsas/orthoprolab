import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClinicaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  direccion?: string;

  @Transform(({ value }: { value: unknown }) =>
    String(value as string)
      .toLowerCase()
      .trim(),
  )
  @IsEmail()
  correo!: string;

  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  adminNombres!: string;

  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  adminApellidos!: string;

  @Matches(/^\d{5,12}$/)
  adminCedula!: string;
}
