import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClinicaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  direccion?: string;
}
