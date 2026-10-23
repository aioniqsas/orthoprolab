import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import type { EnvConfig } from '../config/env.validation.js';
import { QUEUE_PREFIX, SYSTEM_QUEUE } from './queues.constants.js';
import { QueuesService } from './queues.service.js';
import { SystemProcessor } from './system.processor.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        prefix: QUEUE_PREFIX,
        connection: {
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }),
          tls: config.get('REDIS_TLS', { infer: true }) ? {} : undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { count: 1000, age: 24 * 3600 },
          removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue({ name: SYSTEM_QUEUE }),
  ],
  providers: [QueuesService, SystemProcessor],
  exports: [QueuesService, BullModule],
})
export class QueuesModule {}
