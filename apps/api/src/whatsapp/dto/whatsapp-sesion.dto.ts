import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Entrada del endpoint interno del bot. El teléfono llega tal como lo escribió
 * la persona (o como JID de WhatsApp); `normalizeTelefono` hace la validación
 * real. Aquí solo se acota el tipo y la longitud para que un cuerpo enorme o
 * mal tipado no llegue al hasher.
 */
export class WhatsappSesionDto {
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  telefono!: string;
}
