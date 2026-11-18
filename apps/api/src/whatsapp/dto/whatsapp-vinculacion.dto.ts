import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Entrada del canje (T8). Igual que los demás endpoints internos: el teléfono
 * se acota aquí y `normalizeTelefono` valida de verdad; el código son 6 dígitos.
 */
export class WhatsappVincularDto {
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  telefono!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  codigo!: string;
}
