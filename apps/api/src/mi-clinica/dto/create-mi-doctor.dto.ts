import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/;

export class CreateMiDoctorDto {
  @IsString()
  @Matches(NAME_REGEX)
  nombres!: string;

  @IsString()
  @Matches(NAME_REGEX)
  apellidos!: string;

  @IsOptional()
  @IsEmail()
  correo?: string | null;
}
