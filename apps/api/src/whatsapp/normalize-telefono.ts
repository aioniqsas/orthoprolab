/**
 * Canonical form of a Colombian phone number used before hashing, so every
 * representation of one number maps to a single blind index (S8): "+57"
 * followed by the 10 national digits. Accepts an optional leading "+", the
 * "00" international prefix, the "57" country code and separators (spaces,
 * dots, dashes, parentheses). Any other country is rejected, never guessed.
 */
export function normalizeTelefono(value: string): string {
  let digits = value.replace(/[\s.()-]/g, '').replace(/^\+/, '');
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
