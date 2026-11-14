import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const key = (fill: number) => Buffer.alloc(32, fill).toString('base64');
  const ENCRYPTION_KEY = key(1);
  const BLIND_INDEX_KEY = key(2);
  const JWT_SECRET = Buffer.alloc(48, 3).toString('base64');
  const base = {
    DATABASE_PASSWORD: 'secret',
    ENCRYPTION_KEY,
    BLIND_INDEX_KEY,
    JWT_SECRET,
  };

  it('applies dev defaults', () => {
    expect(validateEnv(base)).toEqual({
      PORT: 3003,
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_USER: 'orthopro',
      DATABASE_PASSWORD: 'secret',
      DATABASE_NAME: 'orthopro',
      DATABASE_SSL: false,
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6380,
      REDIS_TLS: false,
      ENCRYPTION_KEY,
      BLIND_INDEX_KEY,
      CLOUDINARY_FOLDER: 'orthopro/catalogo',
      BCRYPT_COST: 12,
      NODE_ENV: 'development',
      CORS_ORIGINS: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ],
      COOKIE_SAMESITE: 'strict',
      TRUST_PROXY: false,
      THROTTLE_DEFAULT_LIMIT: 60,
      THROTTLE_TTL_MS: 60000,
      JWT_SECRET,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 7,
      SESSION_MAX_LIFETIME_DAYS: 30,
      LOGIN_MAX_ATTEMPTS: 3,
      LOGIN_LOCK_SECONDS: 300,
      REFRESH_REUSE_GRACE_SECONDS: 10,
      SMTP_PORT: 587,
      ADMIN_URL: 'http://localhost:3002',
    });
  });

  describe('auth settings', () => {
    it('requires JWT_SECRET', () => {
      const { JWT_SECRET: _omit, ...rest } = base;
      expect(() => validateEnv(rest)).toThrow(/JWT_SECRET is required/);
    });

    it('accepts a base64 secret of at least 32 bytes', () => {
      const ok = Buffer.alloc(32, 9).toString('base64');
      expect(validateEnv({ ...base, JWT_SECRET: ok }).JWT_SECRET).toBe(ok);
    });

    it('rejects short or non-base64 secrets without printing the value', () => {
      for (const bad of [
        Buffer.alloc(31, 9).toString('base64'),
        'not base64 !!! super-secret-value',
      ]) {
        let message = '';
        try {
          validateEnv({ ...base, JWT_SECRET: bad });
        } catch (e) {
          message = (e as Error).message;
        }
        expect(message).toMatch(/JWT_SECRET must be base64 of at least 32/);
        expect(message).not.toContain(bad);
      }
    });

    it('parses numeric overrides', () => {
      const env = validateEnv({
        ...base,
        ACCESS_TOKEN_TTL_SECONDS: '60',
        REFRESH_TOKEN_TTL_DAYS: '1',
        SESSION_MAX_LIFETIME_DAYS: '2',
        LOGIN_MAX_ATTEMPTS: '5',
        LOGIN_LOCK_SECONDS: '2',
        REFRESH_REUSE_GRACE_SECONDS: '0',
      });
      expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(60);
      expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(1);
      expect(env.SESSION_MAX_LIFETIME_DAYS).toBe(2);
      expect(env.LOGIN_MAX_ATTEMPTS).toBe(5);
      expect(env.LOGIN_LOCK_SECONDS).toBe(2);
      expect(env.REFRESH_REUSE_GRACE_SECONDS).toBe(0);
    });

    it.each([
      'ACCESS_TOKEN_TTL_SECONDS',
      'REFRESH_TOKEN_TTL_DAYS',
      'SESSION_MAX_LIFETIME_DAYS',
      'LOGIN_MAX_ATTEMPTS',
      'LOGIN_LOCK_SECONDS',
      'REFRESH_REUSE_GRACE_SECONDS',
    ])('rejects an invalid %s', (name) => {
      expect(() => validateEnv({ ...base, [name]: 'abc' })).toThrow(name);
      expect(() => validateEnv({ ...base, [name]: '-1' })).toThrow(name);
    });

    it('rejects a refresh lifetime longer than the session cap', () => {
      expect(() =>
        validateEnv({
          ...base,
          REFRESH_TOKEN_TTL_DAYS: '30',
          SESSION_MAX_LIFETIME_DAYS: '7',
        }),
      ).toThrow(/SESSION_MAX_LIFETIME_DAYS/);
    });
  });

  describe('security settings', () => {
    it('parses a CORS_ORIGINS list, trimming and dropping empties', () => {
      const env = validateEnv({
        ...base,
        CORS_ORIGINS: ' https://app.example.com , http://localhost:3000,,',
      });
      expect(env.CORS_ORIGINS).toEqual([
        'https://app.example.com',
        'http://localhost:3000',
      ]);
    });

    it.each(['*', 'app.example.com', 'https://a.com/path', 'ftp://a.com'])(
      'rejects invalid CORS origin %s',
      (bad) => {
        expect(() => validateEnv({ ...base, CORS_ORIGINS: bad })).toThrow(
          /CORS_ORIGINS/,
        );
      },
    );

    it('accepts NODE_ENV values and rejects unknown ones', () => {
      expect(validateEnv({ ...base, NODE_ENV: 'production' }).NODE_ENV).toBe(
        'production',
      );
      expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(
        /NODE_ENV/,
      );
    });

    it('accepts strict|lax|none for COOKIE_SAMESITE', () => {
      expect(
        validateEnv({ ...base, COOKIE_SAMESITE: 'lax' }).COOKIE_SAMESITE,
      ).toBe('lax');
      expect(
        validateEnv({ ...base, COOKIE_SAMESITE: 'none' }).COOKIE_SAMESITE,
      ).toBe('none');
      expect(() => validateEnv({ ...base, COOKIE_SAMESITE: 'bogus' })).toThrow(
        /COOKIE_SAMESITE/,
      );
    });

    it('parses TRUST_PROXY as boolean or hop count', () => {
      expect(validateEnv({ ...base, TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(
        true,
      );
      expect(validateEnv({ ...base, TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(
        false,
      );
      expect(validateEnv({ ...base, TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2);
      expect(() => validateEnv({ ...base, TRUST_PROXY: 'maybe' })).toThrow(
        /TRUST_PROXY/,
      );
      expect(() => validateEnv({ ...base, TRUST_PROXY: '-1' })).toThrow(
        /TRUST_PROXY/,
      );
    });

    it('validates THROTTLE_* as bounded integers', () => {
      const env = validateEnv({
        ...base,
        THROTTLE_DEFAULT_LIMIT: '5',
        THROTTLE_TTL_MS: '2000',
      });
      expect(env.THROTTLE_DEFAULT_LIMIT).toBe(5);
      expect(env.THROTTLE_TTL_MS).toBe(2000);
      expect(() =>
        validateEnv({ ...base, THROTTLE_DEFAULT_LIMIT: '0' }),
      ).toThrow(/THROTTLE_DEFAULT_LIMIT/);
      expect(() => validateEnv({ ...base, THROTTLE_TTL_MS: 'x' })).toThrow(
        /THROTTLE_TTL_MS/,
      );
    });

    it('never echoes secret values in errors', () => {
      expect(() =>
        validateEnv({ ...base, ENCRYPTION_KEY: 'topsecretvalue' }),
      ).toThrow(/ENCRYPTION_KEY/);
      try {
        validateEnv({ ...base, ENCRYPTION_KEY: 'topsecretvalue' });
      } catch (e) {
        expect((e as Error).message).not.toContain('topsecretvalue');
      }
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
  describe('Cloudinary', () => {
    const creds = {
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: '123',
      CLOUDINARY_API_SECRET: 'super-secret-value',
    };

    it('is optional and defaults the folder', () => {
      const env = validateEnv(base);
      expect(env.CLOUDINARY_CLOUD_NAME).toBeUndefined();
      expect(env.CLOUDINARY_API_KEY).toBeUndefined();
      expect(env.CLOUDINARY_API_SECRET).toBeUndefined();
      expect(env.CLOUDINARY_FOLDER).toBe('orthopro/catalogo');
    });

    it('accepts all three credentials and a custom folder', () => {
      const env = validateEnv({
        ...base,
        ...creds,
        CLOUDINARY_FOLDER: 'otra/carpeta',
      });
      expect(env.CLOUDINARY_CLOUD_NAME).toBe('demo');
      expect(env.CLOUDINARY_FOLDER).toBe('otra/carpeta');
    });

    it.each([
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ])(
      'rejects partial credentials (missing %s) naming variables, never values',
      (missing) => {
        const partial = { ...creds, [missing]: '' };
        let message = '';
        try {
          validateEnv({ ...base, ...partial });
        } catch (e) {
          message = (e as Error).message;
        }
        expect(message).toMatch(/CLOUDINARY_CLOUD_NAME/);
        expect(message).toMatch(/CLOUDINARY_API_SECRET/);
        expect(message).not.toContain('super-secret-value');
      },
    );

    it.each(['a b', '../x', '/abs', 'x'.repeat(101)])(
      'rejects an unsafe folder %j',
      (CLOUDINARY_FOLDER) => {
        expect(() => validateEnv({ ...base, CLOUDINARY_FOLDER })).toThrow(
          /CLOUDINARY_FOLDER/,
        );
      },
    );
  });
});
