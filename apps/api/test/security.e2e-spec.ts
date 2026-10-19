/**
 * Integration test of the HTTP hardening (configureApp) against live Redis
 * and Postgres. Requires `bun run infra:up` and apps/api/.env in place.
 * Test-only variables are set in-process; .env is never modified.
 */
import { randomInt } from 'node:crypto';
import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';
import request from 'supertest';
import { Public } from './../src/auth/public.decorator.js';
import { AppModule } from './../src/app.module.js';
import { APP_CREATE_OPTIONS, configureApp } from './../src/app.setup.js';
import { RedisThrottlerStorage } from './../src/security/redis-throttler.storage.js';
import { StrictThrottle } from './../src/security/throttle.js';

const ALLOWED = 'http://localhost:3000';
const EVIL = 'https://evil.example';

// ConfigModule.forRoot() validates env at import time, so test-only values
// must be in place before AppModule is imported.
vi.hoisted(() => {
  process.env.TRUST_PROXY = '1';
  process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';
});

class SampleDto {
  @Type(() => String)
  @IsString()
  @MaxLength(10)
  name!: string;

  @Type(() => Number)
  @IsInt()
  age!: number;
}

@Public()
@Controller('_t')
class TestController {
  @Post('echo')
  echo(@Body() dto: SampleDto) {
    return { ok: true, name: dto.name };
  }

  @Post('raw')
  raw(@Req() req: Request) {
    return { body: (req.body as unknown) ?? null };
  }

  @Get('limited')
  @Throttle({ default: { limit: 3 } })
  limited() {
    return { ok: true };
  }

  @Get('login-like')
  @StrictThrottle('login', { limit: 2 })
  strict() {
    return { ok: true };
  }
}

/** Unique per run so counters kept in Redis never leak between runs. */
const freshIp = () =>
  `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;

async function createApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [TestController],
  }).compile();
  const app =
    moduleRef.createNestApplication<NestExpressApplication>(APP_CREATE_OPTIONS);
  configureApp(app);
  await app.init();
  return app;
}

describe('Security baseline (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  const server = () => app.getHttpServer() as never;

  describe('headers', () => {
    it('sets helmet headers and hides x-powered-by', async () => {
      const res = await request(server())
        .get('/health')
        .set('X-Forwarded-For', freshIp());
      expect(res.status).toBe(200);
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
      expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'none'");
      expect(csp).toContain("form-action 'none'");
      expect(res.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('CORS and origin guard', () => {
    it('allows listed origins with credentials', async () => {
      const res = await request(server())
        .get('/health')
        .set('X-Forwarded-For', freshIp())
        .set('Origin', ALLOWED);
      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('gives other origins no CORS headers', async () => {
      const res = await request(server())
        .get('/health')
        .set('X-Forwarded-For', freshIp())
        .set('Origin', EVIL);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('rejects unsafe methods from a disallowed Origin with 403', async () => {
      const res = await request(server())
        .post('/_t/echo')
        .set('X-Forwarded-For', freshIp())
        .set('Origin', EVIL)
        .send({ name: 'a', age: 1 });
      expect(res.status).toBe(403);
    });

    it('lets unsafe methods through with an allowed or no Origin', async () => {
      const body = { name: 'a', age: 1 };
      const withOrigin = await request(server())
        .post('/_t/echo')
        .set('X-Forwarded-For', freshIp())
        .set('Origin', ALLOWED)
        .send(body);
      const without = await request(server())
        .post('/_t/echo')
        .set('X-Forwarded-For', freshIp())
        .send(body);
      expect(withOrigin.status).toBe(201);
      expect(without.status).toBe(201);
    });
  });

  describe('body handling', () => {
    it('rejects JSON bodies over 10kb with 413', async () => {
      const res = await request(server())
        .post('/_t/echo')
        .set('X-Forwarded-For', freshIp())
        .send({ name: 'a', age: 1, pad: 'x'.repeat(11 * 1024) });
      expect(res.status).toBe(413);
      expect(res.body).toMatchObject({ statusCode: 413 });
    });

    it('answers malformed JSON with a generic 400', async () => {
      const res = await request(server())
        .post('/_t/echo')
        .set('X-Forwarded-For', freshIp())
        .set('Content-Type', 'application/json')
        .send('{"name":');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Malformed request body');
    });

    it('does not parse urlencoded bodies', async () => {
      const res = await request(server())
        .post('/_t/raw')
        .set('X-Forwarded-For', freshIp())
        .type('form')
        .send('a=1&b=2');
      expect(res.status).toBe(201);
      expect(
        res.body.body === null || Object.keys(res.body.body).length === 0,
      ).toBe(true);
    });
  });

  describe('validation', () => {
    it('rejects unknown fields and bad types without echoing values', async () => {
      const res = await request(server())
        .post('/_t/echo')
        .set('X-Forwarded-For', freshIp())
        .send({ name: 'SECRET-VALUE-123', age: 'not-a-number', role: 'admin' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        message: expect.any(Array),
        error: 'Bad Request',
      });
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('SECRET-VALUE-123');
      expect(text).not.toContain('not-a-number');
    });
  });

  describe('rate limiting', () => {
    it('returns 429 with Retry-After once the limit is exceeded, per IP', async () => {
      const ip = freshIp();
      const hit = () =>
        request(server()).get('/_t/limited').set('X-Forwarded-For', ip);
      for (let i = 0; i < 3; i++) expect((await hit()).status).toBe(200);
      const blocked = await hit();
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
      expect(blocked.body).toEqual({
        statusCode: 429,
        message: 'Too many requests',
      });
      const other = await request(server())
        .get('/_t/limited')
        .set('X-Forwarded-For', freshIp());
      expect(other.status).toBe(200);
    });

    it('applies strict named throttlers only to opted-in routes', async () => {
      const ip = freshIp();
      const hit = () =>
        request(server()).get('/_t/login-like').set('X-Forwarded-For', ip);
      expect((await hit()).status).toBe(200);
      expect((await hit()).status).toBe(200);
      const blocked = await hit();
      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('keeps /health available under normal use and exposes limit headers', async () => {
      const ip = freshIp();
      for (let i = 0; i < 5; i++) {
        const res = await request(server())
          .get('/health')
          .set('X-Forwarded-For', ip);
        expect(res.status).toBe(200);
      }
      const res = await request(server())
        .get('/health')
        .set('X-Forwarded-For', ip);
      expect(res.headers['x-ratelimit-limit']).toBe('120');
    });

    it('persists counters in Redis across app instances', async () => {
      const ip = freshIp();
      const first = await createApp();
      const second = await createApp();
      try {
        const hit = (a: NestExpressApplication) =>
          request(a.getHttpServer() as never)
            .get('/_t/limited')
            .set('X-Forwarded-For', ip);
        expect((await hit(first)).status).toBe(200);
        expect((await hit(first)).status).toBe(200);
        expect((await hit(second)).status).toBe(200);
        expect((await hit(second)).status).toBe(429);
      } finally {
        await first.close();
        await second.close();
      }
    });

    it('storage increments atomically and blocks past the limit', async () => {
      const storage = app.get(RedisThrottlerStorage);
      const key = `storage-test-${freshIp()}`;
      const records = [];
      for (let i = 0; i < 4; i++) {
        records.push(await storage.increment(key, 5000, 3, 5000, 'default'));
      }
      expect(records.map((r) => r.totalHits)).toEqual([1, 2, 3, 4]);
      expect(records.map((r) => r.isBlocked)).toEqual([
        false,
        false,
        false,
        true,
      ]);
      expect(records[3].timeToBlockExpire).toBeGreaterThan(0);
    });
  });
});
