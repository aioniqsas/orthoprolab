import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PING_JOB, SYSTEM_QUEUE } from './queues.constants.js';

@Injectable()
export class QueuesService {
  constructor(@InjectQueue(SYSTEM_QUEUE) private readonly queue: Queue) {}

  /** Enqueues a ping job and returns its id. */
  async enqueuePing(): Promise<string> {
    const job = await this.queue.add(PING_JOB, {});
    if (!job.id) throw new Error('Queue returned a job without a job id');
    return job.id;
  }
}
