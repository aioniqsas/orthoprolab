import { detectImageType } from './image-validation.js';

const pad = (head: number[], size = 32) =>
  Buffer.concat([Buffer.from(head), Buffer.alloc(size)]);

describe('detectImageType', () => {
  it('detects JPEG', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detects PNG', () => {
    expect(
      detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('image/png');
  });

  it('detects WebP (RIFF....WEBP)', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x10, 0, 0, 0]),
      Buffer.from('WEBP'),
      Buffer.alloc(16),
    ]);
    expect(detectImageType(buf)).toBe('image/webp');
  });

  it.each([
    ['GIF', Buffer.from('GIF89a......')],
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['HTML', Buffer.from('<html><script>alert(1)</script></html>')],
    ['PDF', Buffer.from('%PDF-1.7 ....')],
    ['RIFF but not WebP', Buffer.from('RIFF\x10\x00\x00\x00WAVEfmt ')],
    ['empty', Buffer.alloc(0)],
    ['too short', Buffer.from([0xff, 0xd8])],
  ])('rejects %s', (_label, buf) => {
    expect(detectImageType(buf)).toBeNull();
  });
});
