import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

export const THROTTLER_REDIS = Symbol('THROTTLER_REDIS');

/**
 * Atomic fixed-window counter with block support.
 * KEYS[1] hits, KEYS[2] block flag. ARGV: ttlMs, limit, blockMs.
 * Returns {hits, hitsPttlMs, isBlocked, blockPttlMs}. While blocked, hits are
 * not incremented (same semantics as the in-memory storage).
 */
const SCRIPT = `
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
  local current = tonumber(redis.call('GET', KEYS[1]) or '0')
  return {current, math.max(redis.call('PTTL', KEYS[1]), 0), 1, blockTtl}
end
local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if hits == 1 or ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  return {hits, ttl, 1, tonumber(ARGV[3])}
end
return {hits, ttl, 0, 0}
`;

const toSeconds = (ms: number) => Math.ceil(ms / 1000);

/**
 * Redis-backed ThrottlerStorage so limits are shared across API instances.
 * Own implementation: @nest-lab/throttler-storage-redis peers stop at Nest 11.
 */
@Injectable()
export class RedisThrottlerStorage
  implements ThrottlerStorage, OnModuleDestroy
{
  constructor(@Inject(THROTTLER_REDIS) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const reply = (await this.redis.eval(
      SCRIPT,
      2,
      hitsKey,
      `${hitsKey}:block`,
      String(ttl),
      String(limit),
      String(blockDuration),
    )) as [number, number, number, number];
    const [totalHits, ttlMs, blocked, blockMs] = reply;
    return {
      totalHits,
      timeToExpire: toSeconds(ttlMs),
      isBlocked: blocked === 1,
      timeToBlockExpire: toSeconds(blockMs),
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
