/**
 * Canonical form of an identity document number used before hashing:
 * whitespace, dots and dashes removed, uppercase. "1.234.567", "1 234 567"
 * and " 1234567 " therefore all map to the same blind index.
 */
export function normalizeCedula(value: string): string {
  return value.replace(/[\s.-]/g, '').toUpperCase();
}
