import type { Job } from 'bullmq';
import { SystemProcessor } from './system.processor.js';

const job = (name: string) => ({ id: '1', name }) as unknown as Job;

describe('SystemProcessor', () => {
  it('answers a ping job with a pong result', async () => {
    const result = await new SystemProcessor().process(job('ping'));

    expect(result.pong).toBe(true);
    expect(new Date(result.receivedAt).toISOString()).toBe(result.receivedAt);
  });

  it('rejects unknown job names so they fail visibly', async () => {
    await expect(new SystemProcessor().process(job('nope'))).rejects.toThrow(
      /Unknown system job "nope"/,
    );
  });
});
