import type { CryptoService } from './crypto.service.js';

/**
 * TypeORM transformers and entity hooks are created at class-definition time,
 * outside Nest's DI, so they reach the CryptoService through this module-level
 * holder. `CryptoModule` configures it once at bootstrap; using it before that
 * fails loudly instead of silently storing plaintext.
 */
let active: CryptoService | undefined;

export function configureCrypto(service: CryptoService): void {
  active = service;
}

/** Test helper: return to the unconfigured state. */
export function resetCrypto(): void {
  active = undefined;
}

export function getCrypto(): CryptoService {
  if (!active) {
    throw new Error(
      'CryptoService is not configured: import CryptoModule (or call configureCrypto) before touching protected columns',
    );
  }
  return active;
}
