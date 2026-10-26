import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetalleOrdenDto {
  @IsInt()
  @Min(1)
  servicioId!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class CreateOrdenDto {
  @IsUUID()
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
