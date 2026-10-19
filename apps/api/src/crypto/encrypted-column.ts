import type { ValueTransformer } from 'typeorm';
import { getCrypto } from './crypto.registry.js';

/**
 * Column transformer: encrypts on write, decrypts on read. Entities keep the
 * PLAINTEXT in memory. Use with `type: 'text'` columns (ciphertext is longer
 * than the plaintext). Because every encryption uses a random IV, the stored
 * value cannot be searched or compared: query via the blind index instead.
 */
export function encryptedColumn(): ValueTransformer {
  return {
    to: (value: unknown) =>
      typeof value === 'string' ? getCrypto().encrypt(value) : value,
    from: (value: unknown) =>
      typeof value === 'string' ? getCrypto().decrypt(value) : value,
  };
}
