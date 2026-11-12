/**
 * Integration test: boots the real app against live Redis and Postgres.
 * Requires the local infra: run `bun run infra:up` from the repo root first
 * and have apps/api/.env in place.
 */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { AppModule } from './../src/app.module.js';
import { QueuesService } from './../src/queues/queues.service.js';
import { SYSTEM_QUEUE } from './../src/queues/queues.constants.js';

describe('Queues (e2e)', () => {
  let app: INestApplication;
  let events: QueueEvents;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const queue = app.get<Queue>(getQueueToken(SYSTEM_QUEUE));
    events = new QueueEvents(SYSTEM_QUEUE, {
      prefix: queue.opts.prefix,
      connection: { ...(queue.opts.connection as object) },
    });
    await events.waitUntilReady();
  }, 60_000); // app boot + Redis connection are slow under full-suite parallelism

  afterAll(async () => {
    await events?.close();
    await app?.close();
  });

  it('processes a ping job end to end', async () => {
    const queue = app.get<Queue>(getQueueToken(SYSTEM_QUEUE));
    const id = await app.get(QueuesService).enqueuePing();
    const job = await queue.getJob(id);

    const result = await job!.waitUntilFinished(events, 10_000);

    expect(result).toMatchObject({ pong: true });
    expect(typeof result.receivedAt).toBe('string');
  }, 15_000);
});
