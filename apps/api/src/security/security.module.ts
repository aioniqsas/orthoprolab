import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../config/env.validation.js';
import { AppThrottlerGuard } from './app-throttler.guard.js';
import {
  RedisThrottlerStorage,
  THROTTLER_REDIS,
} from './redis-throttler.storage.js';
import {
  THROTTLER_DEFAULT,
  THROTTLER_LOGIN,
  THROTTLER_REGISTER,
} from './throttle.js';

@Module({
  providers: [
    {
      provide: THROTTLER_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        new Redis({
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }),
          username: config.get('REDIS_USERNAME', { infer: true }),
          tls: config.get('REDIS_TLS', { infer: true }) ? { rejectUnauthorized: false } : undefined,
          maxRetriesPerRequest: 2,
        }),
    },
    RedisThrottlerStorage,
  ],
  exports: [RedisThrottlerStorage],
})
class ThrottlerStorageModule {}

/**
 * Rate limiting for every route (global guard, Redis-backed so limits are
 * shared across instances). `default` always applies; `login` and `register`
 * are stricter and only apply to routes using @StrictThrottle(name).
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (
        config: ConfigService<EnvConfig, true>,
        storage: RedisThrottlerStorage,
      ) => ({
        storage,
        errorMessage: 'Too many requests',
        throttlers: [
          {
            name: THROTTLER_DEFAULT,
            limit: config.get('THROTTLE_DEFAULT_LIMIT', { infer: true }),
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
          },
          {
            name: THROTTLER_LOGIN,
            limit: 10,
            ttl: 60_000,
            blockDuration: 300_000,
          },
          {
            name: THROTTLER_REGISTER,
            limit: 5,
            ttl: 3_600_000,
            blockDuration: 3_600_000,
          },
        ],
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class SecurityModule {}
