import { normalizeTelefono } from './normalize-telefono.js';

// Every way a caller may format the same Colombian mobile must canonicalize
// to one value, otherwise the blind index diverges with the input format.
const REPRESENTACIONES = [
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

describe('normalizeTelefono', () => {
  it('collapses nine representations of one number into the canonical +57 form', () => {
    for (const raw of REPRESENTACIONES) {
      expect(normalizeTelefono(raw)).toBe('+573001234567');
    }
  });

  it('accepts the raw WhatsApp JIDs the bot hands over', () => {
    // T4 delivers Baileys identifiers, not formatted phones: without this
    // the bot would answer telefono_invalido to every user.
    expect(normalizeTelefono('573001234567@s.whatsapp.net')).toBe(
      '+573001234567',
    );
    expect(normalizeTelefono('573001234567:12@s.whatsapp.net')).toBe(
      '+573001234567',
    );
    expect(normalizeTelefono('3001234567@c.us')).toBe('+573001234567');
    expect(normalizeTelefono('573001234567@g.us')).toBe('+573001234567');
    expect(normalizeTelefono('573001234567@broadcast')).toBe(
      '+573001234567',
    );
  });

  it('still rejects garbage wrapped in JID-looking text', () => {
    expect(() => normalizeTelefono('abc@s.whatsapp.net')).toThrow(
      'Invalid phone number',
    );
    expect(() => normalizeTelefono('@s.whatsapp.net')).toThrow(
      'Invalid phone number: empty value',
    );
    // A newline inside the suffix is not a valid JID.
    expect(() => normalizeTelefono('573001234567@s.whatsapp.net\n')).toThrow(
      'Invalid phone number',
    );
    // @lid is a WhatsApp internal id, not phone digits: reject explicitly.
    expect(() => normalizeTelefono('573001234567@lid')).toThrow(
      'Invalid phone number',
    );
    expect(() => normalizeTelefono('312345678901234@lid')).toThrow(
      'Invalid phone number',
    );
  });

  it('rejects values that cannot yield exactly 10 national digits', () => {
    expect(() => normalizeTelefono('')).toThrow(
      'Invalid phone number: empty value',
    );
    expect(() => normalizeTelefono('abc')).toThrow(
      'Invalid phone number: must contain only digits, spaces, dots, dashes and parentheses',
    );
    expect(() => normalizeTelefono('12345')).toThrow(
      'Invalid phone number: expected 10 national digits, got 5',
    );
    expect(() => normalizeTelefono('+1 305 555 0100')).toThrow(
      'Invalid phone number: unsupported country code "1"; only 57 is accepted',
    );
  });

  it('does not guess a country other than 57', () => {
    // Brazil (+55) and a bare 11-digit number are not Colombian: reject.
    expect(() => normalizeTelefono('55 11 9999-9999')).toThrow(
      'Invalid phone number: unsupported country code "55"; only 57 is accepted',
    );
    expect(() => normalizeTelefono('30012345678')).toThrow(
      'Invalid phone number: unsupported country code "3"; only 57 is accepted',
    );
  });
});
