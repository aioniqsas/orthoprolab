import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../config/env.validation.js';
import { HttpRetryController } from './http-retry.controller.js';
import { HttpRetryProcessor } from './http-retry.processor.js';
import { HttpRetryQueueService } from './http-retry.queue.service.js';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';
import { MailProcessor } from './mail.processor.js';
import { MailQueueService } from './mail-queue.service.js';
import {
  HTTP_RETRY_QUEUE,
  MAIL_QUEUE,
  QUEUE_PREFIX,
  RETRY_REDIS,
  SYSTEM_QUEUE,
} from './queues.constants.js';
import { QueuesService } from './queues.service.js';
import { SystemProcessor } from './system.processor.js';

const redisOptions = (config: ConfigService<EnvConfig, true>) => ({
  host: config.get('REDIS_HOST', { infer: true }),
  port: config.get('REDIS_PORT', { infer: true }),
  password: config.get('REDIS_PASSWORD', { infer: true }),
  username: config.get('REDIS_USERNAME', { infer: true }),
  tls: config.get('REDIS_TLS', { infer: true })
    ? { rejectUnauthorized: false }
    : undefined,
});

/** Global: any module may queue mail or make a request replayable. */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        prefix: QUEUE_PREFIX,
        connection: redisOptions(config),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { count: 1000, age: 24 * 3600 },
          removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: SYSTEM_QUEUE },
      { name: MAIL_QUEUE },
      { name: HTTP_RETRY_QUEUE },
    ),
  ],
  controllers: [HttpRetryController],
  providers: [
    QueuesService,
    SystemProcessor,
    MailQueueService,
    MailProcessor,
    HttpRetryQueueService,
    HttpRetryProcessor,
    {
      provide: RETRY_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        new Redis({ ...redisOptions(config), maxRetriesPerRequest: 2 }),
    },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [QueuesService, MailQueueService, HttpRetryQueueService, BullModule],
})
export class QueuesModule {}
