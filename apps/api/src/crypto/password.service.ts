import { createHash } from 'node:crypto';
import { compare, hash } from 'bcrypt';

/** Longest accepted password, in characters (UTF-16 length, as MaxLength). */
export const MAX_PASSWORD_LENGTH = 200;

/**
 * Password hashing with bcrypt (salted, adaptive cost).
 *
 * bcrypt silently ignores bytes beyond 72, which would make two different long
 * passwords equivalent. To support passwords up to 200 characters with no
 * truncation, the password is first reduced to its SHA-256 digest (base64,
 * 44 chars) and only that digest reaches bcrypt. SHA-256 is a fixed-size,
 * non-secret pre-image step; the salt and the work factor still come from bcrypt.
 */
export class PasswordService {
  constructor(private readonly cost: number) {
    if (!Number.isInteger(cost) || cost < 10 || cost > 15) {
      throw new Error('bcrypt cost must be an integer between 10 and 15');
    }
  }

  async hash(plain: string): Promise<string> {
    if (plain === '') throw new Error('Password must not be empty');
    if (plain.length > MAX_PASSWORD_LENGTH) {
      throw new Error(
        `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`,
      );
    }
    return hash(preHash(plain), this.cost);
  }

  /** Returns false (never throws) for wrong passwords and malformed hashes. */
  async verify(plain: string, passwordHash: string): Promise<boolean> {
    if (plain === '' || plain.length > MAX_PASSWORD_LENGTH) return false;
    try {
      return await compare(preHash(plain), passwordHash);
    } catch {
      return false;
    }
  }
}

function preHash(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('base64');
}
