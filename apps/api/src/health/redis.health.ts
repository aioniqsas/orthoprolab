import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Queue } from 'bullmq';
import { SYSTEM_QUEUE } from '../queues/queues.constants.js';

export const REDIS_HEALTH_TIMEOUT_MS = 'REDIS_HEALTH_TIMEOUT_MS';
const DEFAULT_TIMEOUT_MS = 2000;

/** Pings Redis through the `system` queue's own client. */
@Injectable()
export class RedisHealthIndicator {
  constructor(
    @InjectQueue(SYSTEM_QUEUE) private readonly queue: Queue,
    private readonly indicators: HealthIndicatorService,
    @Optional()
    @Inject(REDIS_HEALTH_TIMEOUT_MS)
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async isHealthy<const Key extends string>(key: Key) {
    const session = this.indicators.check(key);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error(`Redis ping timed out after ${this.timeoutMs}ms`)),
          this.timeoutMs,
        );
      });
      await Promise.race([this.ping(), timeout]);
      return session.up();
    } catch (error) {
      return session.down({
        message: error instanceof Error ? error.message : 'Redis unreachable',
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** BullMQ types its client abstractly; the default (ioredis) client has `ping`. */
  private async ping(): Promise<void> {
    const client = (await this.queue.getBackend().client) as unknown as {
      ping(): Promise<string>;
    };
    await client.ping();
  }
}
