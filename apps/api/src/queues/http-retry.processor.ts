import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { HttpRetryJob } from './http-retry.queue.service.js';
import {
  HTTP_RETRY_CONCURRENCY,
  HTTP_RETRY_JOB,
  HTTP_RETRY_QUEUE,
} from './queues.constants.js';

/**
 * Replays a failed portal request against this API. The original request
 * carries an Idempotency-Key, so a replay returns the stored answer instead of
 * repeating the effect.
 */
@Processor(HTTP_RETRY_QUEUE, { concurrency: HTTP_RETRY_CONCURRENCY })
export class HttpRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(HttpRetryProcessor.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async process(job: Job<HttpRetryJob>): Promise<{ status: number }> {
    if (job.name !== HTTP_RETRY_JOB) {
      throw new Error(`Unknown retry job "${job.name}"`);
    }

    const { method, path, body, cookie, idempotencyKey } = job.data;
    const port = this.config.get<number>('PORT') ?? 3003;
    const headers: Record<string, string> = { cookie };
    if (body) headers['content-type'] = 'application/json';
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // 4xx will not improve on retry: the request itself is wrong.
    if (res.status >= 500) {
      throw new Error(`${method} ${path} answered ${res.status}`);
    }
    this.logger.log(`Replayed ${method} ${path} → ${res.status}`);
    return { status: res.status };
  }
}
