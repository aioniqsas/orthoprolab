import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { QueuesModule } from '../queues/queues.module.js';
import { HealthController } from './health.controller.js';
import { RedisHealthIndicator } from './redis.health.js';

@Module({
  imports: [TerminusModule, QueuesModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
