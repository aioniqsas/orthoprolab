import { getCrypto } from '../crypto/crypto.registry.js';

/** JID domains Baileys delivers; `@lid` is a WhatsApp internal id, not a phone. */
const SUFIJOS_JID = ['@s.whatsapp.net', '@c.us', '@g.us', '@broadcast'];

/**
 * Canonical form of a Colombian phone number used before hashing, so every
 * representation of one number maps to a single blind index (S8): "+57"
 * followed by the 10 national digits. Accepts an optional leading "+", the
 * "00" international prefix, the "57" country code and separators (spaces,
 * dots, dashes, parentheses), plus raw WhatsApp JIDs ("573001234567:12@s.whatsapp.net")
 * because the bot hands over Baileys identifiers, not formatted phones (T4).
 * Any other country is rejected, never guessed.
 */
export function normalizeTelefono(value: string): string {
  // Raw JID first: drop the domain suffix, then the ":NN" device id, before
  // any digit work. An unknown suffix (e.g. @lid) is rejected explicitly.
  let base = value;
  const arroba = base.indexOf('@');
  if (arroba !== -1) {
    const sufijo = base.slice(arroba);
    if (!SUFIJOS_JID.includes(sufijo)) {
      throw new Error(
        `Invalid phone number: unsupported WhatsApp suffix "${sufijo}"`,
      );
    }
    base = base.slice(0, arroba);
  }
  base = base.replace(/:\d+$/, '');

  let digits = base.replace(/[\s.()-]/g, '').replace(/^\+/, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits === '') {
    throw new Error('Invalid phone number: empty value');
  }
  if (!/^\d+$/.test(digits)) {
    throw new Error(
      'Invalid phone number: must contain only digits, spaces, dots, dashes and parentheses',
    );
  }
  if (digits.length < 10) {
    throw new Error(
      `Invalid phone number: expected 10 national digits, got ${digits.length}`,
    );
  }
  if (digits.length > 10) {
    const country = digits.slice(0, -10);
    if (country !== '57') {
      throw new Error(
        `Invalid phone number: unsupported country code "${country}"; only 57 is accepted`,
      );
    }
    digits = digits.slice(-10);
  }
  return `+57${digits}`;
}

/**
 * Blind index of the CANONICAL phone (output of normalizeTelefono). Single
 * shared entry point for the entity hook and the identity service, so the
 * stored hash and the lookup hash can never diverge.
 */
export function hashTelefono(canonical: string): string {
  return getCrypto().blindIndex(canonical);
}
