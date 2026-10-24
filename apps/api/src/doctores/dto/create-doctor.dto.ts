import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  nombres!: string;

  @IsString()
  @Matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,100}$/)
  apellidos!: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsInt()
  @Min(1)
  clinicaId!: number;
}
