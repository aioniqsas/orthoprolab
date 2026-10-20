import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PRECIO_REGEX = /^\d{1,10}(\.\d{1,2})?$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** "12" and "12.3" become "12.00" and "12.30" (only after validation passes). */
const normalizePrecio = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && PRECIO_REGEX.test(value)
    ? Number(value).toFixed(2)
    : value;

export class CreateServicioDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  /** Money as a string (numeric(12,2)); never a JS number. */
  @Transform(normalizePrecio)
  @IsString()
  @Matches(PRECIO_REGEX, {
    message: 'precio must be a number with up to 10 digits and 2 decimals',
  })
  precio: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateServicioDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @IsOptional()
  @Transform(normalizePrecio)
  @IsString()
  @Matches(PRECIO_REGEX, {
    message: 'precio must be a number with up to 10 digits and 2 decimals',
  })
  precio?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
