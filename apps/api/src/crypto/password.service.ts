import { compare, hash } from 'bcrypt';

const MAX_PASSWORD_BYTES = 72;

/**
 * Password hashing with bcrypt (salted, adaptive cost).
 *
 * bcrypt silently ignores bytes beyond 72, which would make two different long
 * passwords equivalent. Instead of truncating or pre-hashing, passwords above
 * 72 bytes (UTF-8) are REJECTED when hashing and never match when verifying.
 */
export class PasswordService {
  constructor(private readonly cost: number) {
    if (!Number.isInteger(cost) || cost < 10 || cost > 15) {
      throw new Error('bcrypt cost must be an integer between 10 and 15');
    }
  }

  async hash(plain: string): Promise<string> {
    if (plain === '') throw new Error('Password must not be empty');
    if (Buffer.byteLength(plain, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new Error(
        `Password must not exceed ${MAX_PASSWORD_BYTES} bytes (bcrypt limit)`,
      );
    }
    return hash(plain, this.cost);
  }

  /** Returns false (never throws) for wrong passwords and malformed hashes. */
  async verify(plain: string, passwordHash: string): Promise<boolean> {
    if (Buffer.byteLength(plain, 'utf8') > MAX_PASSWORD_BYTES) return false;
    try {
      return await compare(plain, passwordHash);
    } catch {
      return false;
    }
  }
}
