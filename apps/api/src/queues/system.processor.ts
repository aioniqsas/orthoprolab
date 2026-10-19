import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  PING_JOB,
  SYSTEM_CONCURRENCY,
  SYSTEM_QUEUE,
} from './queues.constants.js';

export interface PingResult {
  pong: true;
  receivedAt: string;
}

/** Proves the BullMQ wiring. Unknown job names fail so they are not lost silently. */
@Processor(SYSTEM_QUEUE, { concurrency: SYSTEM_CONCURRENCY })
export class SystemProcessor extends WorkerHost {
  private readonly logger = new Logger(SystemProcessor.name);

  process(job: Job): Promise<PingResult> {
    if (job.name === PING_JOB) {
      return Promise.resolve({
        pong: true,
        receivedAt: new Date().toISOString(),
      });
    }
    return Promise.reject(new Error(`Unknown system job "${job.name}"`));
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Job ${job?.id} (${job?.name}) failed: ${error.message}`);
  }
}
