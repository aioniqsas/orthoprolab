import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** The amount billed for one order is decided here, not when the order is created. */
export class OrdenAdjuntaDto {
  @IsInt()
  @Min(1)
  ordenId!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999_999.99)
  valor!: number;
}

export class AdjuntarOrdenesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrdenAdjuntaDto)
  ordenes!: OrdenAdjuntaDto[];
}
