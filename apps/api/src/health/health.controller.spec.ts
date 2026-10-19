import { Test } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { RedisHealthIndicator } from './redis.health.js';

describe('HealthController', () => {
  it('runs the database ping through terminus', async () => {
    const pingCheck = vi.fn().mockResolvedValue({ database: { status: 'up' } });
    const isHealthy = vi.fn().mockResolvedValue({ redis: { status: 'up' } });
    const check = vi.fn(async (indicators: Array<() => Promise<unknown>>) => {
      await Promise.all(indicators.map((i) => i()));
      return { status: 'ok' };
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check } },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck } },
        { provide: RedisHealthIndicator, useValue: { isHealthy } },
      ],
    }).compile();

    const result = await moduleRef.get(HealthController).check();

    expect(result).toEqual({ status: 'ok' });
    expect(pingCheck).toHaveBeenCalledWith('database');
    expect(isHealthy).toHaveBeenCalledWith('redis');
  });
});
