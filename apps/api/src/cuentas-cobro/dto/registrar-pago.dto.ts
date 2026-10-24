import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarPagoDto {
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsDateString()
  fechaPago!: string;

  @IsIn(['efectivo', 'transferencia', 'cheque', 'otro'])
  metodo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
