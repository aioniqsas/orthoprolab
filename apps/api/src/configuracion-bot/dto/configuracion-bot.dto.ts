import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export const NOMBRE_BOT_MAX = 40;

/** Sin caracteres de control (el nombre termina en el WhatsApp del cliente). */
const SIN_CONTROL = /^[^\u0000-\u001F\u007F]*$/;

/** Recorta espacios; el validador de longitud corre sobre el valor recortado. */
const trimNombre = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class PatchConfiguracionBotDto {
  @Transform(trimNombre)
  @IsString({ message: 'nombre debe ser una cadena de texto.' })
  @Length(1, NOMBRE_BOT_MAX, {
    message: `nombre debe tener entre 1 y ${NOMBRE_BOT_MAX} caracteres.`,
  })
  @Matches(SIN_CONTROL, { message: 'nombre no puede contener caracteres de control.' })
  nombre: string;
}
