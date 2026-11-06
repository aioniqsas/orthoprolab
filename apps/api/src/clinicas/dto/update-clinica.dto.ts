import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Vacío o nulo borra el correo de la clínica; el resto se normaliza. */
const correoOpcional = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const limpio = value.trim().toLowerCase();
  return limpio === '' ? null : limpio;
};

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

  @IsOptional()
  @Transform(correoOpcional)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(150)
  correo?: string | null;
}
