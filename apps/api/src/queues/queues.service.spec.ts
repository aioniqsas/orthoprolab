import type { Queue } from 'bullmq';
import { QueuesService } from './queues.service.js';

describe('QueuesService', () => {
  it('enqueues a ping job and returns its id', async () => {
    const add = vi.fn().mockResolvedValue({ id: '42' });
    const service = new QueuesService({ add } as unknown as Queue);

    await expect(service.enqueuePing()).resolves.toBe('42');
    expect(add).toHaveBeenCalledWith('ping', {});
  });

  it('throws when the queue returns a job without id', async () => {
    const add = vi.fn().mockResolvedValue({});
    const service = new QueuesService({ add } as unknown as Queue);

    await expect(service.enqueuePing()).rejects.toThrow(/job id/);
  });
});
