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

export class CreateDienteDto {
  @IsInt()
  @IsIn(DIENTES_FDI)
  numero!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  color!: string;
}

export class CreateDetalleOrdenDto {
  @IsInt()
  @Min(1)
  servicioId!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  cantidad!: number;

  /** Teeth covered by this line; at least one, each with its shade. */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDienteDto)
  dientes!: CreateDienteDto[];

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
