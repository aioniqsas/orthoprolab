import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateClinicaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  direccion?: string | null;
}
