import { RedisThrottlerStorage } from './redis-throttler.storage.js';

describe('RedisThrottlerStorage (mapping)', () => {
  function storageReturning(reply: number[]) {
    const evalsha = vi.fn().mockResolvedValue(reply);
    const redis = { eval: evalsha, quit: vi.fn() };
    return {
      storage: new RedisThrottlerStorage(redis as never),
      evalsha,
    };
  }

  it('maps the script reply to a storage record in seconds', async () => {
    const { storage, evalsha } = storageReturning([3, 59_500, 0, 0]);
    const record = await storage.increment('k', 60_000, 10, 60_000, 'default');
    expect(record).toEqual({
      totalHits: 3,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    const args = evalsha.mock.calls[0] as unknown[];
    expect(args.slice(1, 4)).toEqual([
      2,
      'throttle:default:k',
      'throttle:default:k:block',
    ]);
    expect(args.slice(4)).toEqual(['60000', '10', '60000']);
  });

  it('reports a block with the remaining block time', async () => {
    const { storage } = storageReturning([11, 1_000, 1, 59_001]);
    const record = await storage.increment('k', 60_000, 10, 60_000, 'login');
    expect(record.isBlocked).toBe(true);
    expect(record.timeToBlockExpire).toBe(60);
  });
});
