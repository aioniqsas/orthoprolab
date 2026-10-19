import { randomBytes } from 'node:crypto';

/**
 * Test-only secrets, set in-process before any module (ConfigModule validates
 * env at import time). Only fills what is absent: never overrides a value the
 * developer exported, and never touches .env files.
 */
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = randomBytes(48).toString('base64');
}
