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
  NODE_ENV: 'development' | 'production' | 'test';
  /** Allow-list of browser origins (scheme://host[:port]) for CORS and CSRF. */
  CORS_ORIGINS: string[];
  /** SameSite attribute of the auth cookie. */
  COOKIE_SAMESITE: 'strict' | 'lax';
  /** Express "trust proxy": false (off), true, or the number of proxy hops. */
  TRUST_PROXY: boolean | number;
  /** Requests allowed per THROTTLE_TTL_MS for each IP on every route. */
  THROTTLE_DEFAULT_LIMIT: number;
  THROTTLE_TTL_MS: number;
  /** base64 of at least 32 bytes; signs the access JWT (HS256). */
  JWT_SECRET: string;
  /** Lifetime of the access token / auth_token cookie, in seconds. */
  ACCESS_TOKEN_TTL_SECONDS: number;
  /** Lifetime of each refresh token (sliding: renewed on every use), in days. */
  REFRESH_TOKEN_TTL_DAYS: number;
  /** Absolute cap of a session family from its first login, in days. */
  SESSION_MAX_LIFETIME_DAYS: number;
  /** Failed logins (per email) before the cooldown starts. */
  LOGIN_MAX_ATTEMPTS: number;
  /** Cooldown length after too many failed logins, in seconds. */
  LOGIN_LOCK_SECONDS: number;
  /** A just-rotated refresh token reused within this many seconds is not theft. */
  REFRESH_REUSE_GRACE_SECONDS: number;
}

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

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

/**
 * Reads the JWT signing secret: base64 of at least 32 bytes. Errors name the
 * variable only; the value must never appear in errors or logs.
 */
function readJwtSecret(raw: RawEnv, errors: string[]): string {
  const value = asText(raw['JWT_SECRET']).trim();
  if (value === '') {
    errors.push(
      'JWT_SECRET is required (generate with: openssl rand -base64 48)',
    );
    return '';
  }
  const canonical = /^[A-Za-z0-9+/]+={0,2}$/.test(value);
  if (!canonical || Buffer.from(value, 'base64').length < 32) {
    errors.push('JWT_SECRET must be base64 of at least 32 bytes');
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

function readNodeEnv(raw: RawEnv, errors: string[]): EnvConfig['NODE_ENV'] {
  const value = asText(raw['NODE_ENV']).trim();
  if (value === '') return 'development';
  if (value === 'development' || value === 'production' || value === 'test') {
    return value;
  }
  errors.push('NODE_ENV must be one of: development, production, test');
  return 'development';
}

function readCorsOrigins(raw: RawEnv, errors: string[]): string[] {
  const value = asText(raw['CORS_ORIGINS']).trim();
  if (value === '') return [...DEFAULT_CORS_ORIGINS];
  const origins = value
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '');
  const valid = origins.every((o) => {
    try {
      const url = new URL(o);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.origin === o
      );
    } catch {
      return false;
    }
  });
  if (!valid || origins.length === 0) {
    errors.push(
      'CORS_ORIGINS must be a comma separated list of origins like https://app.example.com (scheme, host, optional port; no path, no wildcard)',
    );
    return [...DEFAULT_CORS_ORIGINS];
  }
  return origins;
}

function readSameSite(
  raw: RawEnv,
  errors: string[],
): EnvConfig['COOKIE_SAMESITE'] {
  const value = asText(raw['COOKIE_SAMESITE']).trim().toLowerCase();
  if (value === '') return 'strict';
  if (value === 'strict' || value === 'lax') return value;
  errors.push('COOKIE_SAMESITE must be "strict" or "lax"');
  return 'strict';
}

function readTrustProxy(raw: RawEnv, errors: string[]): boolean | number {
  const value = asText(raw['TRUST_PROXY']).trim().toLowerCase();
  if (value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d{1,2}$/.test(value)) return Number(value);
  errors.push(
    'TRUST_PROXY must be "true", "false" or a number of proxy hops (0-99)',
  );
  return false;
}

function readBoundedInt(
  raw: RawEnv,
  key: string,
  fallback: number,
  min: number,
  max: number,
  errors: string[],
): number {
  const value = asText(raw[key]).trim();
  if (value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    errors.push(`${key} must be an integer between ${min} and ${max}`);
    return fallback;
  }
  return n;
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
    NODE_ENV: readNodeEnv(raw, errors),
    CORS_ORIGINS: readCorsOrigins(raw, errors),
    COOKIE_SAMESITE: readSameSite(raw, errors),
    TRUST_PROXY: readTrustProxy(raw, errors),
    THROTTLE_DEFAULT_LIMIT: readBoundedInt(
      raw,
      'THROTTLE_DEFAULT_LIMIT',
      60,
      1,
      100000,
      errors,
    ),
    THROTTLE_TTL_MS: readBoundedInt(
      raw,
      'THROTTLE_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    JWT_SECRET: readJwtSecret(raw, errors),
    ACCESS_TOKEN_TTL_SECONDS: readBoundedInt(
      raw,
      'ACCESS_TOKEN_TTL_SECONDS',
      900,
      30,
      86400,
      errors,
    ),
    REFRESH_TOKEN_TTL_DAYS: readBoundedInt(
      raw,
      'REFRESH_TOKEN_TTL_DAYS',
      7,
      1,
      90,
      errors,
    ),
    SESSION_MAX_LIFETIME_DAYS: readBoundedInt(
      raw,
      'SESSION_MAX_LIFETIME_DAYS',
      30,
      1,
      365,
      errors,
    ),
    LOGIN_MAX_ATTEMPTS: readBoundedInt(
      raw,
      'LOGIN_MAX_ATTEMPTS',
      3,
      1,
      100,
      errors,
    ),
    LOGIN_LOCK_SECONDS: readBoundedInt(
      raw,
      'LOGIN_LOCK_SECONDS',
      300,
      1,
      86400,
      errors,
    ),
    REFRESH_REUSE_GRACE_SECONDS: readBoundedInt(
      raw,
      'REFRESH_REUSE_GRACE_SECONDS',
      10,
      0,
      300,
      errors,
    ),
  };
  if (config.REFRESH_TOKEN_TTL_DAYS > config.SESSION_MAX_LIFETIME_DAYS) {
    errors.push(
      'SESSION_MAX_LIFETIME_DAYS must be greater than or equal to REFRESH_TOKEN_TTL_DAYS',
    );
  }
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
