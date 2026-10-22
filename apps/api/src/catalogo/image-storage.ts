/** Port for the external image host (Cloudinary in production). */
export interface ImageStorage {
  upload(
    buffer: Buffer,
    options: { publicIdHint: string },
  ): Promise<{ url: string; publicId: string }>;
  delete(publicId: string): Promise<void>;
}

/** Nest provider token for the active ImageStorage. */
export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

/** Upload or delete failed at the provider (details are logged, never sent to clients). */
export class ImageStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageStorageError';
  }
}

/** The Cloudinary credentials are not set: uploads answer 503. */
export class ImageStorageNotConfiguredError extends Error {
  constructor() {
    super('Image storage is not configured');
    this.name = 'ImageStorageNotConfiguredError';
  }
}

export class NotConfiguredImageStorage implements ImageStorage {
  upload(
    _buffer?: Buffer,
    _options?: { publicIdHint: string },
  ): Promise<never> {
    return Promise.reject(new ImageStorageNotConfiguredError());
  }
  delete(_publicId?: string): Promise<never> {
    return Promise.reject(new ImageStorageNotConfiguredError());
  }
}

/** Only `https://res.cloudinary.com/<cloud>/...` URLs may be stored or fetched (SSRF guard). */
export function isCloudinaryUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.hostname === 'res.cloudinary.com' &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    url.pathname.length > 1
  );
}
