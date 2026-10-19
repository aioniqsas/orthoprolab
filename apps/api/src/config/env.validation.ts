export interface EnvConfig {
  PORT: number;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
}

type RawEnv = Record<string, unknown>;

function readString(
  raw: RawEnv,
  key: string,
  fallback: string | undefined,
  errors: string[],
): string {
  const value = raw[key];
  if (value === undefined || value === null || value === '') {
    if (fallback === undefined) {
      errors.push(`${key} is required`);
      return '';
    }
    return fallback;
  }
  return String(value);
}

function readPort(
  raw: RawEnv,
  key: string,
  fallback: number,
  errors: string[],
): number {
  const value = raw[key];
  if (value === undefined || value === null || value === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`${key} must be an integer between 1 and 65535 (got )`);
    return fallback;
  }
  return port;
}

/** Validates and types process env; throws one error listing every problem. */
export function validateEnv(raw: RawEnv): EnvConfig {
  const errors: string[] = [];
  const DATABASE_PASSWORD = readString(raw, 'DATABASE_PASSWORD', undefined, errors);
  const config: EnvConfig = {
    PORT: readPort(raw, 'PORT', 3003, errors),
    DATABASE_HOST: readString(raw, 'DATABASE_HOST', 'localhost', errors),
    DATABASE_PORT: readPort(raw, 'DATABASE_PORT', 5432, errors),
    DATABASE_USER: readString(raw, 'DATABASE_USER', 'orthopro', errors),
    DATABASE_PASSWORD,
    DATABASE_NAME: readString(raw, 'DATABASE_NAME', 'orthopro', errors),
    REDIS_HOST: readString(raw, 'REDIS_HOST', 'localhost', errors),
    REDIS_PORT: readPort(raw, 'REDIS_PORT', 6380, errors),
  };
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }
  return config;
}
