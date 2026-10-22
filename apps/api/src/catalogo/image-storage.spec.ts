import { ConfigService } from '@nestjs/config';
import {
  ImageStorageNotConfiguredError,
  isCloudinaryUrl,
  NotConfiguredImageStorage,
} from './image-storage.js';
import { createImageStorage } from './image-storage.provider.js';
import { CloudinaryImageStorage } from './cloudinary-image-storage.js';

describe('isCloudinaryUrl', () => {
  it.each([
    'https://res.cloudinary.com/demo/image/upload/v1/orthopro/catalogo/a.jpg',
  ])('accepts %s', (url) => {
    expect(isCloudinaryUrl(url)).toBe(true);
  });

  it.each([
    'http://res.cloudinary.com/demo/image/upload/a.jpg',
    'https://res.cloudinary.com.evil.test/demo/a.jpg',
    'https://evil.test/res.cloudinary.com/demo/a.jpg',
    'https://user@res.cloudinary.com/demo/a.jpg',
    'https://res.cloudinary.com',
    'https://res.cloudinary.com/',
    'javascript:alert(1)',
    'not a url',
    '',
  ])('rejects %j', (url) => {
    expect(isCloudinaryUrl(url)).toBe(false);
  });
});

describe('NotConfiguredImageStorage', () => {
  it('throws a typed error on upload and delete', async () => {
    const storage = new NotConfiguredImageStorage();
    await expect(
      storage.upload(Buffer.from('x'), { publicIdHint: 'a' }),
    ).rejects.toBeInstanceOf(ImageStorageNotConfiguredError);
    await expect(storage.delete('x')).rejects.toBeInstanceOf(
      ImageStorageNotConfiguredError,
    );
  });
});

describe('createImageStorage (provider selection)', () => {
  const config = (values: Record<string, unknown>) =>
    ({ get: (key: string) => values[key] }) as unknown as ConfigService<
      never,
      true
    >;

  it('binds NotConfiguredImageStorage when credentials are absent', () => {
    expect(createImageStorage(config({}))).toBeInstanceOf(
      NotConfiguredImageStorage,
    );
  });

  it('binds the Cloudinary adapter when all credentials exist', () => {
    const storage = createImageStorage(
      config({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'k',
        CLOUDINARY_API_SECRET: 's',
        CLOUDINARY_FOLDER: 'orthopro/catalogo',
      }),
    );
    expect(storage).toBeInstanceOf(CloudinaryImageStorage);
  });
});
