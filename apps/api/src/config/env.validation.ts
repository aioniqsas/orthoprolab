export interface EnvConfig {
  PORT: number;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  /** Optional; omitted when Redis has no auth (local dev). */
  REDIS_PASSWORD?: string;
  /** base64 of 32 bytes. Losing it makes encrypted personal data unrecoverable. */
  ENCRYPTION_KEY: string;
  /** base64 of 32 bytes, independent from ENCRYPTION_KEY. */
  BLIND_INDEX_KEY: string;
  /** bcrypt work factor, integer 10..15 (default 12). */
  BCRYPT_COST: number;
}

type RawEnv = Record<string, unknown>;

function readString(
  raw: RawEnv,
  key: string,
  fallback: string | undefined,
  errors: string[],
): string {
  const value = asText(raw[key]);
  if (value === '') {
    if (fallback === undefined) {
      errors.push(`${key} is required`);
      return '';
    }
    return fallback;
  }
  return value;
}

/** Env values arrive as strings; anything that is not a primitive counts as unset. */
function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function readPort(
  raw: RawEnv,
  key: string,
  fallback: number,
  errors: string[],
): number {
  const value = asText(raw[key]);
  if (value === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`${key} must be an integer between 1 and 65535 (got ${value})`);
    return fallback;
  }
  return port;
}

/**
 * Reads a base64 key of exactly 32 bytes. Error messages name the variable
 * only: key material must never appear in errors or logs.
 */
function readKey(raw: RawEnv, key: string, errors: string[]): string {
  const value = asText(raw[key]).trim();
  if (value === '') {
    errors.push(`${key} is required (generate with: bun run keys:generate)`);
    return '';
  }
  const decoded = Buffer.from(value, 'base64');
  const canonical = /^[A-Za-z0-9+/]+={0,2}$/.test(value);
  if (!canonical || decoded.length !== 32) {
    errors.push(`${key} must be base64 of exactly 32 bytes`);
    return '';
  }
  return value;
}

function readBcryptCost(raw: RawEnv, errors: string[]): number {
  const value = asText(raw['BCRYPT_COST']);
  if (value === '') return 12;
  const cost = Number(value);
  if (!Number.isInteger(cost) || cost < 10 || cost > 15) {
    errors.push('BCRYPT_COST must be an integer between 10 and 15');
    return 12;
  }
  return cost;
}

/** Validates and types process env; throws one error listing every problem. */
export function validateEnv(raw: RawEnv): EnvConfig {
  const errors: string[] = [];
  const DATABASE_PASSWORD = readString(
    raw,
    'DATABASE_PASSWORD',
    undefined,
    errors,
  );
  const config: EnvConfig = {
    PORT: readPort(raw, 'PORT', 3003, errors),
    DATABASE_HOST: readString(raw, 'DATABASE_HOST', 'localhost', errors),
    DATABASE_PORT: readPort(raw, 'DATABASE_PORT', 5432, errors),
    DATABASE_USER: readString(raw, 'DATABASE_USER', 'orthopro', errors),
    DATABASE_PASSWORD,
    DATABASE_NAME: readString(raw, 'DATABASE_NAME', 'orthopro', errors),
    REDIS_HOST: readString(raw, 'REDIS_HOST', 'localhost', errors),
    REDIS_PORT: readPort(raw, 'REDIS_PORT', 6380, errors),
    ENCRYPTION_KEY: readKey(raw, 'ENCRYPTION_KEY', errors),
    BLIND_INDEX_KEY: readKey(raw, 'BLIND_INDEX_KEY', errors),
    BCRYPT_COST: readBcryptCost(raw, errors),
  };
  if (
    config.ENCRYPTION_KEY !== '' &&
    config.ENCRYPTION_KEY === config.BLIND_INDEX_KEY
  ) {
    errors.push('ENCRYPTION_KEY and BLIND_INDEX_KEY must differ');
  }
  const redisPassword = asText(raw['REDIS_PASSWORD']);
  if (redisPassword !== '') {
    config.REDIS_PASSWORD = redisPassword;
  }
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }
  return config;
}
