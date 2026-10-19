import {
  LoginAttemptsService,
  type LoginAttemptsStore,
} from './login-attempts.service.js';

/** In-memory Redis subset with a controllable clock (ms). */
class FakeStore implements LoginAttemptsStore {
  now = 0;
  private data = new Map<string, { value: string; expiresAt?: number }>();

  private live(key: string) {
    const entry = this.data.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= this.now) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }
  incr(key: string): Promise<number> {
    const entry = this.live(key);
    const next = Number(entry?.value ?? 0) + 1;
    this.data.set(key, { value: String(next), expiresAt: entry?.expiresAt });
    return Promise.resolve(next);
  }
  expire(key: string, seconds: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return Promise.resolve(0);
    entry.expiresAt = this.now + seconds * 1000;
    return Promise.resolve(1);
  }
  set(key: string, value: string, _ex: 'EX', seconds: number): Promise<'OK'> {
    this.data.set(key, { value, expiresAt: this.now + seconds * 1000 });
    return Promise.resolve('OK');
  }
  pttl(key: string): Promise<number> {
    const entry = this.live(key);
    if (!entry) return Promise.resolve(-2);
    if (entry.expiresAt === undefined) return Promise.resolve(-1);
    return Promise.resolve(entry.expiresAt - this.now);
  }
  del(...keys: string[]): Promise<number> {
    keys.forEach((k) => this.data.delete(k));
    return Promise.resolve(keys.length);
  }
  keys() {
    return [...this.data.keys()];
  }
}

describe('LoginAttemptsService', () => {
  let store: FakeStore;
  let svc: LoginAttemptsService;
  beforeEach(() => {
    store = new FakeStore();
    svc = new LoginAttemptsService(store, {
      maxAttempts: 3,
      lockSeconds: 300,
    });
  });

  it('is not locked before any failure', async () => {
    expect(await svc.lockedSeconds('k')).toBe(0);
  });

  it('locks on the 3rd failure, not before', async () => {
    expect((await svc.recordFailure('k')).locked).toBe(false);
    expect((await svc.recordFailure('k')).locked).toBe(false);
    expect(await svc.lockedSeconds('k')).toBe(0);
    expect((await svc.recordFailure('k')).locked).toBe(true);
    expect(await svc.lockedSeconds('k')).toBe(300);
  });

  it('reports the remaining lock time rounded up and unlocks on expiry', async () => {
    for (let i = 0; i < 3; i++) await svc.recordFailure('k');
    store.now = 100_500;
    expect(await svc.lockedSeconds('k')).toBe(200);
    store.now = 300_000;
    expect(await svc.lockedSeconds('k')).toBe(0);
  });

  it('starts a fresh count after the lock expires', async () => {
    for (let i = 0; i < 3; i++) await svc.recordFailure('k');
    store.now = 301_000;
    expect((await svc.recordFailure('k')).locked).toBe(false);
  });

  it('counts per key (unknown emails behave like known ones)', async () => {
    for (let i = 0; i < 3; i++) await svc.recordFailure('a');
    expect(await svc.lockedSeconds('a')).toBe(300);
    expect(await svc.lockedSeconds('b')).toBe(0);
  });

  it('resets the counter on success', async () => {
    await svc.recordFailure('k');
    await svc.recordFailure('k');
    await svc.reset('k');
    expect((await svc.recordFailure('k')).locked).toBe(false);
    expect((await svc.recordFailure('k')).locked).toBe(false);
  });

  it('expires stale counters so failures do not accumulate forever', async () => {
    await svc.recordFailure('k');
    await svc.recordFailure('k');
    store.now = 301_000;
    expect((await svc.recordFailure('k')).locked).toBe(false);
  });
});
