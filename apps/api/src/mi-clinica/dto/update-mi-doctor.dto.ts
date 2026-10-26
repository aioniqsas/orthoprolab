import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/;

export class UpdateMiDoctorDto {
  @IsOptional()
  @IsString()
  @Matches(NAME_REGEX)
  nombres?: string;

  @IsOptional()
  @IsString()
  @Matches(NAME_REGEX)
  apellidos?: string;

  @IsOptional()
  @IsEmail()
  correo?: string | null;
}
