import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { RetryRequestDto } from './http-retry.dto.js';
import { HTTP_RETRY_JOB, HTTP_RETRY_QUEUE } from './queues.constants.js';

export interface HttpRetryJob {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
  /** Cookie of the user who made the original request; the API replays as them. */
  cookie: string;
  idempotencyKey: string | null;
}

@Injectable()
export class HttpRetryQueueService {
  private readonly logger = new Logger(HttpRetryQueueService.name);

  constructor(@InjectQueue(HTTP_RETRY_QUEUE) private readonly queue: Queue) {}

  async enqueue(dto: RetryRequestDto, cookie: string): Promise<{ jobId: string | null }> {
    const job = await this.queue.add(
      HTTP_RETRY_JOB,
      {
        method: dto.method,
        path: dto.path,
        body: dto.body ?? null,
        cookie,
        idempotencyKey: dto.idempotencyKey ?? null,
      } satisfies HttpRetryJob,
      {
        attempts: 6,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );
    this.logger.warn(`Queued ${dto.method} ${dto.path} for retry (job ${job.id})`);
    return { jobId: job.id ?? null };
  }
}
