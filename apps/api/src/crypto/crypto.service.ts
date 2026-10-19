import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { normalizeCedula } from './normalize-cedula.js';

export interface CryptoKeys {
  /** base64 of exactly 32 bytes (AES-256). */
  encryptionKey: string;
  /** base64 of exactly 32 bytes; MUST differ from encryptionKey. */
  blindIndexKey: string;
}

const KEY_BYTES = 32;
const IV_BYTES = 12; // recommended IV size for GCM
const TAG_BYTES = 16;
const ALGORITHM = 'aes-256-gcm';

/**
 * Key id of the key that encrypts NEW values. It is the first field of every
 * payload: `v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`.
 *
 * Rotation (not implemented): introduce `ENCRYPTION_KEY_V2` and make `v2` the
 * current id; `decrypt` would pick the key by the payload prefix so `v1` rows
 * stay readable while a background job re-encrypts every protected column
 * (`decrypt` with the old id, `encrypt` with the new one) in batches. Once no
 * `v1:` value remains, the old key can be retired. The blind index key is
 * rotated the same way but requires recomputing `cedula_hash` from plaintext.
 */
const CURRENT_VERSION = 'v1';

function loadKey(name: string, base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  // Never include the value in the message.
  if (key.length !== KEY_BYTES) {
    throw new Error(`${name} must be base64 of exactly ${KEY_BYTES} bytes`);
  }
  return key;
}

/**
 * Application-level protection of personal data (Ley 1581 de 2012: technical
 * measures). AES-256-GCM for confidentiality + integrity, HMAC-SHA256 blind
 * index for equality lookups/uniqueness without exposing the value.
 *
 * Plain class (no Nest decorators) so it can be built in tests and scripts;
 * `CryptoModule` provides it from validated configuration.
 */
export class CryptoService {
  private readonly encryptionKey: Buffer;
  private readonly blindIndexKey: Buffer;

  constructor(keys: CryptoKeys) {
    this.encryptionKey = loadKey('ENCRYPTION_KEY', keys.encryptionKey);
    this.blindIndexKey = loadKey('BLIND_INDEX_KEY', keys.blindIndexKey);
  }

  encrypt(plain: string): string;
  encrypt(plain: null): null;
  encrypt(plain: undefined): undefined;
  encrypt(plain: string | null | undefined): string | null | undefined;
  encrypt(plain: string | null | undefined): string | null | undefined {
    if (plain === null || plain === undefined) return plain;
    const iv = randomBytes(IV_BYTES); // fresh random IV per value
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: TAG_BYTES,
    });
    const ciphertext = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    return [
      CURRENT_VERSION,
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string): string;
  decrypt(payload: null): null;
  decrypt(payload: undefined): undefined;
  decrypt(payload: string | null | undefined): string | null | undefined;
  decrypt(payload: string | null | undefined): string | null | undefined {
    if (payload === null || payload === undefined) return payload;
    const parts = payload.split(':');
    if (parts.length !== 4) {
      throw new Error('Cannot decrypt: malformed payload');
    }
    const [version, ivB64, tagB64, dataB64] = parts;
    if (version !== CURRENT_VERSION) {
      throw new Error(`Cannot decrypt: unknown key version "${version}"`);
    }
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new Error('Cannot decrypt: malformed payload');
    }
    try {
      const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv, {
        authTagLength: TAG_BYTES,
      });
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // GCM authentication failed: wrong key or tampered data. Never return garbage.
      throw new Error('Cannot decrypt: wrong key or tampered data');
    }
  }

  /**
   * Deterministic HMAC-SHA256 (hex) of the normalized identity number, keyed
   * with a key SEPARATE from the encryption key. Same id => same hash, so it
   * supports equality lookup and UNIQUE constraints on `cedula_hash`.
   */
  blindIndex(value: string): string {
    const normalized = normalizeCedula(value);
    if (normalized === '') {
      throw new Error('Cannot compute blind index of an empty value');
    }
    return createHmac('sha256', this.blindIndexKey)
      .update(normalized, 'utf8')
      .digest('hex');
  }
}
