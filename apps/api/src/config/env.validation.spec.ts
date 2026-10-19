import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const key = (fill: number) => Buffer.alloc(32, fill).toString('base64');
  const ENCRYPTION_KEY = key(1);
  const BLIND_INDEX_KEY = key(2);
  const base = { DATABASE_PASSWORD: 'secret', ENCRYPTION_KEY, BLIND_INDEX_KEY };

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
      ENCRYPTION_KEY,
      BLIND_INDEX_KEY,
      BCRYPT_COST: 12,
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
    expect(() => validateEnv({ ...base, DATABASE_PASSWORD: '' })).toThrow(
      /DATABASE_PASSWORD/,
    );
  });

  describe('data protection keys', () => {
    const messageOf = (raw: Record<string, unknown>) => {
      try {
        validateEnv(raw);
      } catch (e) {
        return (e as Error).message;
      }
      throw new Error('expected validateEnv to throw');
    };

    it('requires both keys', () => {
      const msg = messageOf({ DATABASE_PASSWORD: 'secret' });
      expect(msg).toMatch(/ENCRYPTION_KEY is required/);
      expect(msg).toMatch(/BLIND_INDEX_KEY is required/);
    });

    it('rejects keys that are not 32 bytes without leaking their value', () => {
      const short = Buffer.alloc(16, 9).toString('base64');
      const msg = messageOf({ ...base, ENCRYPTION_KEY: short });
      expect(msg).toMatch(/ENCRYPTION_KEY/);
      expect(msg).not.toContain(short);
    });

    it('rejects keys that are not base64 without leaking their value', () => {
      const bad = 'this is not base64 !!! secret-material';
      const msg = messageOf({ ...base, BLIND_INDEX_KEY: bad });
      expect(msg).toMatch(/BLIND_INDEX_KEY/);
      expect(msg).not.toContain(bad);
    });

    it('rejects using the same key for both purposes', () => {
      const msg = messageOf({ ...base, BLIND_INDEX_KEY: ENCRYPTION_KEY });
      expect(msg).toMatch(/must differ/);
      expect(msg).not.toContain(ENCRYPTION_KEY);
    });
  });

  describe('BCRYPT_COST', () => {
    it('defaults to 12 and accepts 10..15', () => {
      expect(validateEnv(base).BCRYPT_COST).toBe(12);
      expect(validateEnv({ ...base, BCRYPT_COST: '10' }).BCRYPT_COST).toBe(10);
      expect(validateEnv({ ...base, BCRYPT_COST: '15' }).BCRYPT_COST).toBe(15);
    });

    it.each(['9', '16', 'abc', '12.5'])('rejects %s', (v) => {
      expect(() => validateEnv({ ...base, BCRYPT_COST: v })).toThrow(
        /BCRYPT_COST/,
      );
    });
  });
});
