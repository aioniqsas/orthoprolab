import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDetalleOrdenDto } from './create-orden.dto.js';

export class UpdateOrdenDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleOrdenDto)
  detalles?: CreateDetalleOrdenDto[];

  @IsOptional()
  @IsDateString()
  fechaEntrega?: string | null;

  @IsOptional()
  @IsBoolean()
  urgente?: boolean;
}
