import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Permanent dentition, FDI two-digit numbering. */
export const DIENTES_FDI = [
  11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34,
  35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
];

export class CreateDetalleOrdenDto {
  /** Free text: the work to perform, e.g. "Corona de zirconia". */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  servicio!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  cantidad!: number;

  /** FDI numbers of the teeth covered by this line; at least one. */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsIn(DIENTES_FDI, { each: true })
  dientes!: number[];

  /** Shade shared by every tooth of the line (e.g. VITA "A2"). */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  colorDiente!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class CreateOrdenDto {
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pacienteId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pacienteCedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pacienteNombre?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleOrdenDto)
  detalles!: CreateDetalleOrdenDto[];

  @IsOptional()
  @IsDateString()
  fechaEntrega?: string;

  @IsOptional()
  @IsBoolean()
  urgente?: boolean;
}
