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

  it('supports passwords up to 200 characters without truncation', async () => {
    const long = 'a'.repeat(200);
    const hash = await svc.hash(long);
    expect(await svc.verify(long, hash)).toBe(true);
  });

  it('does not treat passwords that differ only after byte 72 as equal', async () => {
    const hash = await svc.hash('a'.repeat(72) + 'X');
    expect(await svc.verify('a'.repeat(72) + 'Y', hash)).toBe(false);
    expect(await svc.verify('a'.repeat(72), hash)).toBe(false);
    expect(await svc.verify('a'.repeat(72) + 'X', hash)).toBe(true);
  });

  it('handles multibyte characters beyond 72 bytes', async () => {
    const pw = 'é'.repeat(100); // 200 bytes
    const hash = await svc.hash(pw);
    expect(await svc.verify(pw, hash)).toBe(true);
    expect(await svc.verify('é'.repeat(99) + 'e', hash)).toBe(false);
  });

  it('rejects hashing passwords over 200 characters', async () => {
    await expect(svc.hash('a'.repeat(201))).rejects.toThrow(/200 characters/);
  });

  it('returns false when verifying a password over 200 characters', async () => {
    const hash = await svc.hash('a'.repeat(200));
    expect(await svc.verify('a'.repeat(201), hash)).toBe(false);
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
