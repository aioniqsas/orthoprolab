export type AllowedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length &&
  bytes.every((b, i) => buf[offset + i] === b);

/**
 * Detects JPEG, PNG and WebP from the file's magic bytes. The client-declared
 * mimetype and filename are never trusted. Returns null for anything else.
 */
export function detectImageType(buf: Buffer): AllowedImageType | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buf, PNG_SIGNATURE)) return 'image/png';
  if (
    startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && // RIFF
    startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8) // WEBP
  ) {
    return 'image/webp';
  }
  return null;
}
