import { randomBytes } from 'node:crypto';
import { getMetadataArgsStorage } from 'typeorm';
import type { ValueTransformer } from 'typeorm';
import { CryptoService } from '../crypto/crypto.service.js';
import { configureCrypto, resetCrypto } from '../crypto/crypto.registry.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';

const mk = () =>
  new CryptoService({
    encryptionKey: randomBytes(32).toString('base64'),
    blindIndexKey: randomBytes(32).toString('base64'),
  });

const column = (propertyName: string) =>
  getMetadataArgsStorage().columns.find((c) => c.propertyName === propertyName);

describe('WhatsappContacto', () => {
  afterEach(() => resetCrypto());

  it('hashes the phone into the blind index on insert and update', () => {
    const svc = mk();
    configureCrypto(svc);

    const contacto = new WhatsappContacto();
    contacto.telefonoCifrado = '+573001234567';
    contacto.syncTelefonoHash();
    expect(contacto.telefonoHash).toBe(svc.blindIndex('+573001234567'));
    expect(contacto.telefonoHash).toMatch(/^[0-9a-f]{64}$/);

    contacto.telefonoCifrado = '+573009999999';
    contacto.syncTelefonoHash();
    expect(contacto.telefonoHash).toBe(svc.blindIndex('+573009999999'));
  });

  it('hashes every representation of the same number to one blind index', () => {
    const svc = mk();
    configureCrypto(svc);

    // Same nine representations as normalize-telefono.spec.ts: without phone
    // canonicalization each format would produce its own hash and the same
    // person could register twice (or the allowlist would miss them).
    const representaciones = [
      '+573001234567',
      '573001234567',
      '3001234567',
      '(300) 1234567',
      '00573001234567',
      '+57 300 123 4567',
      '57-300-123-4567',
      '0057 300.123.4567',
      '300 1234 567',
    ];
    const esperado = svc.blindIndex('+573001234567');

    for (const raw of representaciones) {
      const contacto = new WhatsappContacto();
      contacto.telefonoCifrado = raw;
      contacto.syncTelefonoHash();
      expect(contacto.telefonoHash).toBe(esperado);
    }
  });

  it('keeps the stored hash when a partial update carries no phone', () => {
    configureCrypto(mk());

    const contacto = new WhatsappContacto();
    contacto.telefonoHash = 'a'.repeat(64);
    contacto.syncTelefonoHash();
    expect(contacto.telefonoHash).toBe('a'.repeat(64));
  });

  it('stores the phone encrypted, never as plaintext', () => {
    configureCrypto(mk());

    const transformer = column('telefonoCifrado')?.options
      .transformer as ValueTransformer;
    expect(transformer).toBeDefined();

    const stored = transformer.to!('+573001234567') as string;
    expect(stored).not.toContain('573001234567');
    expect(stored.startsWith('v1:')).toBe(true);
    expect(transformer.from!(stored)).toBe('+573001234567');
  });

  it('makes telefono_hash unique and doctor_id nullable', () => {
    const index = getMetadataArgsStorage().indices.find(
      (i) => i.name === 'uq_whatsapp_contacto_telefono_hash',
    );
    expect(index?.unique).toBe(true);
    expect(index?.columns).toEqual(['telefonoHash']);

    // TypeORM only sets nullable when it is true; undefined means NOT NULL.
    expect(column('clinicaId')?.options.nullable).not.toBe(true);
    expect(column('doctorId')?.options.nullable).toBe(true);
    expect(column('estado')?.options.default).toBe('pendiente');
    expect(column('verificadoEn')?.options.nullable).toBe(true);
  });
});
