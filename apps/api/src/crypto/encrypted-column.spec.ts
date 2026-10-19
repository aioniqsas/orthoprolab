import { randomBytes } from 'node:crypto';
import { CryptoService } from './crypto.service.js';
import { configureCrypto, resetCrypto, getCrypto } from './crypto.registry.js';
import { encryptedColumn } from './encrypted-column.js';
import { cedulaHash } from './cedula.js';

const mk = () =>
  new CryptoService({
    encryptionKey: randomBytes(32).toString('base64'),
    blindIndexKey: randomBytes(32).toString('base64'),
  });

describe('encryptedColumn transformer', () => {
  afterEach(() => resetCrypto());

  it('fails loudly when crypto was never configured', () => {
    const t = encryptedColumn();
    expect(() => t.to('x')).toThrow(/not configured/i);
    expect(() => t.from('v1:a:b:c')).toThrow(/not configured/i);
    expect(() => getCrypto()).toThrow(/not configured/i);
    expect(() => cedulaHash('1')).toThrow(/not configured/i);
  });

  it('encrypts on write and decrypts on read', () => {
    configureCrypto(mk());
    const t = encryptedColumn();
    const stored = t.to('Maria') as string;
    expect(stored.startsWith('v1:')).toBe(true);
    expect(stored).not.toContain('Maria');
    expect(t.from(stored)).toBe('Maria');
  });

  it('passes null and undefined through', () => {
    configureCrypto(mk());
    const t = encryptedColumn();
    expect(t.to(null)).toBeNull();
    expect(t.to(undefined)).toBeUndefined();
    expect(t.from(null)).toBeNull();
  });

  it('fails when the key changes', () => {
    configureCrypto(mk());
    const stored = encryptedColumn().to('x') as string;
    configureCrypto(mk());
    expect(() => encryptedColumn().from(stored)).toThrow(/decrypt/i);
  });

  it('cedulaHash uses the configured blind index', () => {
    const svc = mk();
    configureCrypto(svc);
    expect(cedulaHash('1.234.567')).toBe(svc.blindIndex('1234567'));
  });
});
