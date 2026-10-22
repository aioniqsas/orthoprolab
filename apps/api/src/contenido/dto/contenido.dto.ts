import { Transform } from 'class-transformer';
import {
  IsObject,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { MAX_PARRAFO } from '../contenido.schema.js';

const CLAVE_REGEX = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

/** A batch is at most one value per field; anything larger is not a valid body. */
const MAX_CLAVES = 200;

/**
 * Boundary checks: `valores` is a flat map of short keys to strings, trimmed.
 * Whether a key exists in the schema, its per-tipo limit and the image allow
 * list are the contract's rules and live in ContenidoService.
 */
@ValidatorConstraint({ name: 'mapaDeContenido' })
class MapaDeContenidoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length <= MAX_CLAVES &&
      Object.entries(value).every(
        ([clave, texto]) =>
          CLAVE_REGEX.test(clave) &&
          typeof texto === 'string' &&
          texto.length <= MAX_PARRAFO,
      )
    );
  }

  defaultMessage({ property }: ValidationArguments): string {
    return `${property} debe ser un objeto con claves del tipo "pagina.seccion.campo" y textos de hasta ${MAX_PARRAFO} caracteres.`;
  }
}

/** Trims the keys and values; non-strings are left for the validator to reject. */
const trimValores = ({ value }: { value: unknown }): unknown =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).map(([clave, texto]) => [
          clave.trim(),
          typeof texto === 'string' ? texto.trim() : texto,
        ]),
      )
    : value;

export class PutContenidoDto {
  @Transform(trimValores)
  @IsObject({ message: 'valores debe ser un objeto.' })
  @Validate(MapaDeContenidoConstraint)
  valores: Record<string, string>;
}
