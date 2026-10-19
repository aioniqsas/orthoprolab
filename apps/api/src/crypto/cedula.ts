import { getCrypto } from './crypto.registry.js';

/**
 * Blind index of an identity number, for `WHERE cedula_hash = :hash` lookups.
 * Callers must never query the encrypted `cedula` column.
 */
export function cedulaHash(cedula: string): string {
  return getCrypto().blindIndex(cedula);
}

/** Hash for a possibly-null cedula (patients may have none). */
export function cedulaHashOrNull(cedula: string | null | undefined) {
  return cedula === null || cedula === undefined || cedula === ''
    ? null
    : cedulaHash(cedula);
}
