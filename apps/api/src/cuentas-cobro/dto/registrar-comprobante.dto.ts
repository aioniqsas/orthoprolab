import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Multipart fields sent by the client portal alongside the receipt file. */
export class RegistrarComprobanteDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsDateString()
  fechaPago!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
