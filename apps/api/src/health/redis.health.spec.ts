import type { Queue } from 'bullmq';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health.js';

const queueWith = (ping: () => Promise<string>) =>
  ({
    getBackend: () => ({ client: Promise.resolve({ ping }) }),
  }) as unknown as Queue;

describe('RedisHealthIndicator', () => {
  it('reports up when redis answers PONG', async () => {
    const indicator = new RedisHealthIndicator(
      queueWith(() => Promise.resolve('PONG')),
      new HealthIndicatorService(),
    );

    await expect(indicator.isHealthy('redis')).resolves.toEqual({
      redis: { status: 'up' },
    });
  });

  it('reports down when the ping fails', async () => {
    const indicator = new RedisHealthIndicator(
      queueWith(() => Promise.reject(new Error('ECONNREFUSED'))),
      new HealthIndicatorService(),
    );

    await expect(indicator.isHealthy('redis')).resolves.toMatchObject({
      redis: { status: 'down' },
    });
  });

  it('reports down when the ping times out', async () => {
    const indicator = new RedisHealthIndicator(
      queueWith(() => new Promise<string>(() => {})),
      new HealthIndicatorService(),
      20,
    );

    await expect(indicator.isHealthy('redis')).resolves.toMatchObject({
      redis: { status: 'down' },
    });
  });
});
