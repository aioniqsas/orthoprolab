import { describe, expect, it } from 'vitest';
import { detectComprobanteType } from './comprobante-upload.interceptor.js';

describe('detectComprobanteType', () => {
  it('accepts a PDF by magic bytes', () => {
    expect(detectComprobanteType(Buffer.from('%PDF-1.7\n...'))).toBe(
      'application/pdf',
    );
  });

  it('accepts an image by magic bytes', () => {
    expect(
      detectComprobanteType(
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      ),
    ).toBe('image/jpeg');
  });

  it('rejects anything else', () => {
    expect(detectComprobanteType(Buffer.from('not a receipt'))).toBeNull();
  });
});
