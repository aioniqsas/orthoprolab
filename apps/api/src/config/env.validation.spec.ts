import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const base = { DATABASE_PASSWORD: 'secret' };

  it('applies dev defaults', () => {
    expect(validateEnv(base)).toEqual({
      PORT: 3003,
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_USER: 'orthopro',
      DATABASE_PASSWORD: 'secret',
      DATABASE_NAME: 'orthopro',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6380,
    });
  });

  it('coerces ports to numbers and keeps overrides', () => {
    const env = validateEnv({
      ...base,
      PORT: '4000',
      DATABASE_PORT: '5432',
      REDIS_PORT: '6379',
      DATABASE_HOST: 'db',
    });
    expect(env.PORT).toBe(4000);
    expect(env.DATABASE_PORT).toBe(5432);
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.DATABASE_HOST).toBe('db');
  });

  it('keeps an optional REDIS_PASSWORD only when set', () => {
    expect(validateEnv({ ...base, REDIS_PASSWORD: 'r' }).REDIS_PASSWORD).toBe(
      'r',
    );
    expect(validateEnv({ ...base, REDIS_PASSWORD: '' })).not.toHaveProperty(
      'REDIS_PASSWORD',
    );
  });

  it('throws listing a missing DATABASE_PASSWORD', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_PASSWORD/);
  });

  it('throws listing every invalid variable', () => {
    expect(() =>
      validateEnv({ DATABASE_PORT: 'abc', REDIS_PORT: '70000', PORT: '0' }),
    ).toThrow(
      /DATABASE_PASSWORD[\s\S]*PORT[\s\S]*DATABASE_PORT[\s\S]*REDIS_PORT/,
    );
  });

  it('treats empty strings as missing', () => {
    expect(() => validateEnv({ DATABASE_PASSWORD: '' })).toThrow(
      /DATABASE_PASSWORD/,
    );
  });
});
