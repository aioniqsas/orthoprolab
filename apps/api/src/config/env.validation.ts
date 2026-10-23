import { z } from 'zod';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

/**
 * Normalize a raw env value to a trimmed string or undefined.
 * Empty strings, null, and undefined are all treated as absent.
 */
function fromEnv(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

const envSchema = z
  .object({
    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_PASSWORD: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DATABASE_PASSWORD is required',
          });
          return '';
        }
        return v;
      }),
    ),

    PORT: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 3003;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 65535) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'PORT must be an integer between 1 and 65535',
          });
          return 3003;
        }
        return n;
      }),
    ),

    DATABASE_HOST: z.preprocess(
      fromEnv,
      z.string().optional().transform(v => v ?? 'localhost'),
    ),

    DATABASE_PORT: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 5432;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 65535) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'DATABASE_PORT must be an integer between 1 and 65535',
          });
          return 5432;
        }
        return n;
      }),
    ),

    DATABASE_USER: z.preprocess(
      fromEnv,
      z.string().optional().transform(v => v ?? 'orthopro'),
    ),

    DATABASE_NAME: z.preprocess(
      fromEnv,
      z.string().optional().transform(v => v ?? 'orthopro'),
    ),

    DATABASE_SSL: z.preprocess(
      fromEnv,
      z
        .string()
        .optional()
        .transform((v): boolean => {
          if (v === undefined || v === '') return false;
          const lv = v.toLowerCase();
          return lv === 'true' || lv === '1' || lv === 'yes';
        }),
    ),

    // ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_HOST: z.preprocess(
      fromEnv,
      z.string().optional().transform(v => v ?? 'localhost'),
    ),

    REDIS_PORT: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 6380;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 65535) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'REDIS_PORT must be an integer between 1 and 65535',
          });
          return 6380;
        }
        return n;
      }),
    ),

    /** Optional; omitted when Redis has no auth (local dev). */
    REDIS_PASSWORD: z.preprocess(fromEnv, z.string().optional()),

    /** Optional; used for Redis ACL AUTH (Redis 7+, e.g. Render Key Value). */
    REDIS_USERNAME: z.preprocess(fromEnv, z.string().optional()),

    /** Set to "true" / "1" / "yes" when Redis requires TLS (e.g. Render Key Value). */
    REDIS_TLS: z.preprocess(
      fromEnv,
      z
        .string()
        .optional()
        .transform((v): boolean => {
          if (v === undefined || v === '') return false;
          const lv = v.toLowerCase();
          return lv === 'true' || lv === '1' || lv === 'yes';
        }),
    ),

    // ── Data-protection keys ──────────────────────────────────────────────────
    /** base64 of 32 bytes. Losing it makes encrypted personal data unrecoverable. */
    ENCRYPTION_KEY: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'ENCRYPTION_KEY is required (generate with: bun run keys:generate)',
          });
          return '';
        }
        const canonical = /^[A-Za-z0-9+/]+={0,2}$/.test(v);
        if (!canonical || Buffer.from(v, 'base64').length !== 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'ENCRYPTION_KEY must be base64 of exactly 32 bytes',
          });
          return '';
        }
        return v;
      }),
    ),

    /** base64 of 32 bytes, independent from ENCRYPTION_KEY. */
    BLIND_INDEX_KEY: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'BLIND_INDEX_KEY is required (generate with: bun run keys:generate)',
          });
          return '';
        }
        const canonical = /^[A-Za-z0-9+/]+={0,2}$/.test(v);
        if (!canonical || Buffer.from(v, 'base64').length !== 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'BLIND_INDEX_KEY must be base64 of exactly 32 bytes',
          });
          return '';
        }
        return v;
      }),
    ),

    // ── Application settings ──────────────────────────────────────────────────
    /** bcrypt work factor, integer 10..15 (default 12). */
    BCRYPT_COST: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 12;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 10 || n > 15) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'BCRYPT_COST must be an integer between 10 and 15',
          });
          return 12;
        }
        return n;
      }),
    ),

    NODE_ENV: z.preprocess(
      fromEnv,
      z
        .string()
        .optional()
        .transform((v, ctx): 'development' | 'production' | 'test' => {
          if (v === undefined) return 'development';
          if (v === 'development' || v === 'production' || v === 'test')
            return v;
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'NODE_ENV must be one of: development, production, test',
          });
          return 'development';
        }),
    ),

    /** Allow-list of browser origins (scheme://host[:port]) for CORS and CSRF. */
    CORS_ORIGINS: z.preprocess(
      fromEnv,
      z
        .string()
        .optional()
        .transform((v, ctx): string[] => {
          if (v === undefined) return [...DEFAULT_CORS_ORIGINS];
          const origins = v
            .split(',')
            .map(o => o.trim())
            .filter(o => o !== '');
          const valid =
            origins.length > 0 &&
            origins.every(o => {
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
          if (!valid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                'CORS_ORIGINS must be a comma separated list of origins like https://app.example.com (scheme, host, optional port; no path, no wildcard)',
            });
            return [...DEFAULT_CORS_ORIGINS];
          }
          return origins;
        }),
    ),

    /** SameSite attribute of the auth cookie. */
    COOKIE_SAMESITE: z.preprocess(
      fromEnv,
      z
        .string()
        .optional()
        .transform((v, ctx): 'strict' | 'lax' => {
          if (v === undefined) return 'strict';
          const lv = v.toLowerCase();
          if (lv === 'strict' || lv === 'lax') return lv as 'strict' | 'lax';
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'COOKIE_SAMESITE must be "strict" or "lax"',
          });
          return 'strict';
        }),
    ),

    /** Express "trust proxy": false (off), true, or the number of proxy hops. */
    TRUST_PROXY: z.preprocess(
      fromEnv,
      z
        .string()
        .optional()
        .transform((v, ctx): boolean | number => {
          if (v === undefined) return false;
          const lv = v.toLowerCase();
          if (lv === 'false') return false;
          if (lv === 'true') return true;
          if (/^\d{1,2}$/.test(v)) return Number(v);
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'TRUST_PROXY must be "true", "false" or a number of proxy hops (0-99)',
          });
          return false;
        }),
    ),

    /** Requests allowed per THROTTLE_TTL_MS for each IP on every route. */
    THROTTLE_DEFAULT_LIMIT: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 60;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 100000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'THROTTLE_DEFAULT_LIMIT must be an integer between 1 and 100000',
          });
          return 60;
        }
        return n;
      }),
    ),

    THROTTLE_TTL_MS: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 60000;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1000 || n > 3600000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'THROTTLE_TTL_MS must be an integer between 1000 and 3600000',
          });
          return 60000;
        }
        return n;
      }),
    ),

    // ── JWT / session ─────────────────────────────────────────────────────────
    /** base64 of at least 32 bytes; signs the access JWT (HS256). */
    JWT_SECRET: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'JWT_SECRET is required (generate with: openssl rand -base64 48)',
          });
          return '';
        }
        const canonical = /^[A-Za-z0-9+/]+={0,2}$/.test(v);
        if (!canonical || Buffer.from(v, 'base64').length < 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'JWT_SECRET must be base64 of at least 32 bytes',
          });
          return '';
        }
        return v;
      }),
    ),

    /** Lifetime of the access token / auth_token cookie, in seconds. */
    ACCESS_TOKEN_TTL_SECONDS: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 900;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 30 || n > 86400) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'ACCESS_TOKEN_TTL_SECONDS must be an integer between 30 and 86400',
          });
          return 900;
        }
        return n;
      }),
    ),

    /** Lifetime of each refresh token (sliding: renewed on every use), in days. */
    REFRESH_TOKEN_TTL_DAYS: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 7;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 90) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'REFRESH_TOKEN_TTL_DAYS must be an integer between 1 and 90',
          });
          return 7;
        }
        return n;
      }),
    ),

    /** Absolute cap of a session family from its first login, in days. */
    SESSION_MAX_LIFETIME_DAYS: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 30;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 365) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'SESSION_MAX_LIFETIME_DAYS must be an integer between 1 and 365',
          });
          return 30;
        }
        return n;
      }),
    ),

    /** Failed logins (per email) before the cooldown starts. */
    LOGIN_MAX_ATTEMPTS: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 3;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'LOGIN_MAX_ATTEMPTS must be an integer between 1 and 100',
          });
          return 3;
        }
        return n;
      }),
    ),

    /** Cooldown length after too many failed logins, in seconds. */
    LOGIN_LOCK_SECONDS: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 300;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 86400) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'LOGIN_LOCK_SECONDS must be an integer between 1 and 86400',
          });
          return 300;
        }
        return n;
      }),
    ),

    /** A just-rotated refresh token reused within this many seconds is not theft. */
    REFRESH_REUSE_GRACE_SECONDS: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        if (v === undefined) return 10;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 300) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'REFRESH_REUSE_GRACE_SECONDS must be an integer between 0 and 300',
          });
          return 10;
        }
        return n;
      }),
    ),

    // ── Cloudinary ────────────────────────────────────────────────────────────
    /** Cloudinary credentials: all three or none (uploads answer 503 without). */
    CLOUDINARY_CLOUD_NAME: z.preprocess(fromEnv, z.string().optional()),
    CLOUDINARY_API_KEY: z.preprocess(fromEnv, z.string().optional()),
    CLOUDINARY_API_SECRET: z.preprocess(fromEnv, z.string().optional()),

    /** Cloudinary folder for catalog images (default orthopro/catalogo). */
    CLOUDINARY_FOLDER: z.preprocess(
      fromEnv,
      z.string().optional().transform((v, ctx) => {
        const fallback = 'orthopro/catalogo';
        if (v === undefined) return fallback;
        if (
          v.length > 100 ||
          !/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/.test(v)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'CLOUDINARY_FOLDER must be a path like orthopro/catalogo (letters, digits, "-", "_" and "/"; max 100 characters)',
          });
          return fallback;
        }
        return v;
      }),
    ),
  })
  .superRefine((data, ctx) => {
    // 1. Cloudinary credentials must be all-or-nothing.
    const cloud = [
      data.CLOUDINARY_CLOUD_NAME,
      data.CLOUDINARY_API_KEY,
      data.CLOUDINARY_API_SECRET,
    ];
    const provided = cloud.filter(v => v !== undefined && v !== '').length;
    if (provided > 0 && provided < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET must be set together (all three or none)',
      });
    }

    // 2. Refresh token lifetime must not exceed the session lifetime cap.
    if (data.REFRESH_TOKEN_TTL_DAYS > data.SESSION_MAX_LIFETIME_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'SESSION_MAX_LIFETIME_DAYS must be greater than or equal to REFRESH_TOKEN_TTL_DAYS',
      });
    }

    // 3. Data-protection keys must be distinct (check only when both parsed).
    if (
      data.ENCRYPTION_KEY !== '' &&
      data.ENCRYPTION_KEY === data.BLIND_INDEX_KEY
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ENCRYPTION_KEY and BLIND_INDEX_KEY must differ',
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

/** Validates and types process env; throws one error listing every problem. */
export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(i => i.message);
    throw new Error(
      `Invalid environment configuration:\n- ${issues.join('\n- ')}`,
    );
  }
  const config = result.data;
  // Remove REDIS_PASSWORD / REDIS_USERNAME when not provided so callers using
  // `in` / `hasOwnProperty` see no property rather than a property with value undefined.
  if (config.REDIS_PASSWORD === undefined) {
    Reflect.deleteProperty(config, 'REDIS_PASSWORD');
  }
  if (config.REDIS_USERNAME === undefined) {
    Reflect.deleteProperty(config, 'REDIS_USERNAME');
  }
  return config;
}
