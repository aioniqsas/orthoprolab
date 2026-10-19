/** Subset of ioredis used by the lockout (also implemented by test fakes). */
export interface LoginAttemptsStore {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    seconds: number,
  ): Promise<unknown>;
  pttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
}

export interface LoginAttemptsOptions {
  maxAttempts: number;
  lockSeconds: number;
}

const FAIL_PREFIX = 'auth:login:fail:';
const LOCK_PREFIX = 'auth:login:lock:';

/**
 * Failed-login counters and cooldown locks in Redis. Keys are opaque (an HMAC
 * of the normalized email, see CryptoService.loginKey): unknown emails are
 * counted exactly like known ones, and raw emails are never stored.
 */
export class LoginAttemptsService {
  constructor(
    private readonly store: LoginAttemptsStore,
    private readonly options: LoginAttemptsOptions,
  ) {}

  /** Seconds left of the cooldown (rounded up), or 0 when not locked. */
  async lockedSeconds(key: string): Promise<number> {
    const ms = await this.store.pttl(LOCK_PREFIX + key);
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }

  /** Counts a failure; the max-th one starts the cooldown. */
  async recordFailure(key: string): Promise<{ locked: boolean }> {
    const failKey = FAIL_PREFIX + key;
    const count = await this.store.incr(failKey);
    if (count === 1) {
      await this.store.expire(failKey, this.options.lockSeconds);
    }
    if (count >= this.options.maxAttempts) {
      await this.store.set(
        LOCK_PREFIX + key,
        '1',
        'EX',
        this.options.lockSeconds,
      );
      await this.store.del(failKey);
      return { locked: true };
    }
    return { locked: false };
  }

  async reset(key: string): Promise<void> {
    await this.store.del(FAIL_PREFIX + key);
  }
}
