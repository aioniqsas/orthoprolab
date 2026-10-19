import { randomBytes } from 'node:crypto';
import { CryptoService } from './crypto.service.js';

const key = () => randomBytes(32).toString('base64');

describe('CryptoService', () => {
  const encryptionKey = key();
  const blindIndexKey = key();
  const svc = new CryptoService({ encryptionKey, blindIndexKey });

  describe('encrypt / decrypt', () => {
    it('round-trips plain and unicode text', () => {
      for (const text of [
        'hola',
        'Ñandú Pérez – 日本語 🦷',
        '',
        'a'.repeat(5000),
      ]) {
        expect(svc.decrypt(svc.encrypt(text))).toBe(text);
      }
    });

    it('uses the v1:<iv>:<tag>:<ciphertext> format with a 12-byte IV', () => {
      const parts = svc.encrypt('x')!.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('v1');
      expect(Buffer.from(parts[1], 'base64')).toHaveLength(12);
      expect(Buffer.from(parts[2], 'base64')).toHaveLength(16);
    });

    it('produces different payloads for the same text (random IV)', () => {
      expect(svc.encrypt('same')).not.toBe(svc.encrypt('same'));
    });

    it('never contains the plaintext in the payload', () => {
      expect(svc.encrypt('Maria Gomez')).not.toContain('Maria');
    });

    it('passes null and undefined through unchanged', () => {
      expect(svc.encrypt(null)).toBeNull();
      expect(svc.encrypt(undefined)).toBeUndefined();
      expect(svc.decrypt(null)).toBeNull();
      expect(svc.decrypt(undefined)).toBeUndefined();
    });

    it('throws on tampered ciphertext, tag or IV', () => {
      const [v, iv, tag, ct] = svc.encrypt('secret')!.split(':');
      const flip = (b64: string) => {
        const buf = Buffer.from(b64, 'base64');
        buf[0] ^= 1;
        return buf.toString('base64');
      };
      expect(() => svc.decrypt([v, iv, tag, flip(ct)].join(':'))).toThrow(
        /decrypt/i,
      );
      expect(() => svc.decrypt([v, iv, flip(tag), ct].join(':'))).toThrow(
        /decrypt/i,
      );
      expect(() => svc.decrypt([v, flip(iv), tag, ct].join(':'))).toThrow(
        /decrypt/i,
      );
    });

    it('throws with a wrong key', () => {
      const other = new CryptoService({ encryptionKey: key(), blindIndexKey });
      expect(() => other.decrypt(svc.encrypt('secret'))).toThrow(/decrypt/i);
    });

    it('throws on an unknown version prefix', () => {
      const payload = svc.encrypt('x')!.replace(/^v1/, 'v9');
      expect(() => svc.decrypt(payload)).toThrow(/version/i);
    });

    it('throws on a malformed payload', () => {
      expect(() => svc.decrypt('not-a-payload')).toThrow();
      expect(() => svc.decrypt('v1:a:b')).toThrow();
    });

    it('rejects keys that are not 32 bytes without leaking them', () => {
      const bad = Buffer.alloc(16, 7).toString('base64');
      let message = '';
      try {
        new CryptoService({ encryptionKey: bad, blindIndexKey });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toMatch(/32 bytes/);
      expect(message).not.toContain(bad);
    });
  });

  describe('blindIndex', () => {
    it('is deterministic 64-char hex', () => {
      const h = svc.blindIndex('1234567');
      expect(h).toMatch(/^[0-9a-f]{64}$/);
      expect(svc.blindIndex('1234567')).toBe(h);
    });

    it('normalizes spaces, dots, dashes, case and surrounding whitespace', () => {
      const h = svc.blindIndex('1234567');
      expect(svc.blindIndex(' 1.234.567 ')).toBe(h);
      expect(svc.blindIndex('1-234 567')).toBe(h);
      expect(svc.blindIndex('ab12')).toBe(svc.blindIndex('AB-12'));
    });

    it('differs for different values and for different keys', () => {
      expect(svc.blindIndex('1')).not.toBe(svc.blindIndex('2'));
      const other = new CryptoService({ encryptionKey, blindIndexKey: key() });
      expect(other.blindIndex('1')).not.toBe(svc.blindIndex('1'));
    });

    it('is independent from the encryption key', () => {
      const other = new CryptoService({ encryptionKey: key(), blindIndexKey });
      expect(other.blindIndex('1')).toBe(svc.blindIndex('1'));
    });

    it('rejects an empty value after normalization', () => {
      expect(() => svc.blindIndex(' .- ')).toThrow();
    });
  });

  describe('loginKey', () => {
    it('is a deterministic HMAC of the normalized email', () => {
      const k = svc.loginKey('Doc@Example.com');
      expect(k).toMatch(/^[0-9a-f]{64}$/);
      expect(svc.loginKey(' doc@example.com ')).toBe(k);
      expect(svc.loginKey('other@example.com')).not.toBe(k);
      expect(k).not.toContain('doc');
    });

    it('uses a domain prefix distinct from the cedula blind index', () => {
      expect(svc.loginKey('12345')).not.toBe(svc.blindIndex('12345'));
    });
  });
});
