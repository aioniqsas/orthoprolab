import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Entrada de los endpoints internos de llamada y auditoría (T7). Igual que en
 * la sesión: el teléfono se acota aquí y `normalizeTelefono` valida de verdad.
 */
export class WhatsappLlamadaDto {
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  telefono!: string;
}

/** Intenciones de auditoría (S8): intención y paso, jamás el cuerpo. */
export const INTENCIONES_AUDITORIA = [
  'menu',
  'estado',
  'control',
  'cuenta',
  'orden_creada',
  'llamada',
  'rechazada',
] as const;

export class WhatsappAuditoriaDto {
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  telefono!: string;

  @IsIn(INTENCIONES_AUDITORIA)
  intencion!: string;

  @IsString()
  @MaxLength(64)
  paso!: string;
}
