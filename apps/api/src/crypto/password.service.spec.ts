import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const svc = new PasswordService(10);

  it('hashes with bcrypt and never returns the plain text', async () => {
    const hash = await svc.hash('S3cret-pass');
    expect(hash).not.toContain('S3cret-pass');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('salts: the same password hashes differently each time', async () => {
    expect(await svc.hash('same')).not.toBe(await svc.hash('same'));
  });

  it('verifies the right and the wrong password', async () => {
    const hash = await svc.hash('right');
    expect(await svc.verify('right', hash)).toBe(true);
    expect(await svc.verify('wrong', hash)).toBe(false);
  });

  it('returns false (never throws) on a malformed or empty hash', async () => {
    expect(await svc.verify('x', 'not-a-hash')).toBe(false);
    expect(await svc.verify('x', '')).toBe(false);
    expect(await svc.verify('x', '$2b$10$short')).toBe(false);
  });

  it('returns false for a password above 72 bytes instead of truncating', async () => {
    const hash = await svc.hash('a'.repeat(72));
    expect(await svc.verify('a'.repeat(73), hash)).toBe(false);
  });

  it('rejects hashing passwords longer than 72 bytes', async () => {
    await expect(svc.hash('a'.repeat(73))).rejects.toThrow(/72 bytes/);
    // multibyte: 37 x 2 bytes = 74 bytes
    await expect(svc.hash('é'.repeat(37))).rejects.toThrow(/72 bytes/);
  });

  it('rejects an empty password', async () => {
    await expect(svc.hash('')).rejects.toThrow();
  });

  it('validates the cost factor', () => {
    expect(() => new PasswordService(9)).toThrow(/cost/i);
    expect(() => new PasswordService(16)).toThrow(/cost/i);
    expect(() => new PasswordService(12.5)).toThrow(/cost/i);
  });
});
