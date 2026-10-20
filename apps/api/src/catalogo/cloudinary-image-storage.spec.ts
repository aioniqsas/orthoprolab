import { PassThrough } from 'node:stream';
import {
  CloudinaryImageStorage,
  type CloudinarySdk,
} from './cloudinary-image-storage.js';
import { ImageStorageError } from './image-storage.js';

type UploadResult = { secure_url?: string; public_id?: string } | undefined;

function fakeSdk(opts: {
  result?: UploadResult;
  error?: Error;
  destroy?: () => Promise<unknown>;
}) {
  const uploadOptions: Record<string, unknown>[] = [];
  const chunks: Buffer[] = [];
  const destroy = vi.fn(
    opts.destroy ?? (() => Promise.resolve({ result: 'ok' })),
  );
  const config = vi.fn();
  const sdk: CloudinarySdk = {
    config,
    uploader: {
      upload_stream: (options, cb) => {
        uploadOptions.push(options as Record<string, unknown>);
        const stream = new PassThrough();
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', () => {
          if (opts.error) cb(opts.error, undefined);
          else cb(undefined, opts.result);
        });
        return stream;
      },
      destroy,
    },
  };
  return { sdk, uploadOptions, chunks, destroy, config };
}

const settings = {
  cloudName: 'demo',
  apiKey: 'key',
  apiSecret: 'secret',
  folder: 'orthopro/catalogo',
};

describe('CloudinaryImageStorage', () => {
  it('configures the SDK with https delivery and the credentials', () => {
    const { sdk, config } = fakeSdk({});
    new CloudinaryImageStorage(settings, sdk);
    expect(config).toHaveBeenCalledWith({
      cloud_name: 'demo',
      api_key: 'key',
      api_secret: 'secret',
      secure: true,
    });
  });

  it('uploads the buffer with safe options and returns url + publicId', async () => {
    const { sdk, uploadOptions, chunks } = fakeSdk({
      result: {
        secure_url:
          'https://res.cloudinary.com/demo/image/upload/v1/orthopro/catalogo/x.jpg',
        public_id: 'orthopro/catalogo/x',
      },
    });
    const storage = new CloudinaryImageStorage(settings, sdk);
    const out = await storage.upload(Buffer.from('bytes'), {
      publicIdHint: 'ortodoncia-fija',
    });
    expect(out).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/orthopro/catalogo/x.jpg',
      publicId: 'orthopro/catalogo/x',
    });
    expect(Buffer.concat(chunks).toString()).toBe('bytes');
    expect(uploadOptions[0]).toMatchObject({
      folder: 'orthopro/catalogo',
      resource_type: 'image',
      overwrite: false,
      unique_filename: true,
      use_filename: false,
    });
    expect(String(uploadOptions[0].public_id)).toMatch(
      /^ortodoncia-fija-[a-f0-9]{16}$/,
    );
  });

  it('sanitizes the public id hint', async () => {
    const { sdk, uploadOptions } = fakeSdk({
      result: {
        secure_url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
        public_id: 'a',
      },
    });
    await new CloudinaryImageStorage(settings, sdk).upload(Buffer.from('x'), {
      publicIdHint: '../../Etc/Passwd Ñ',
    });
    expect(String(uploadOptions[0].public_id)).toMatch(/^[a-z0-9-]+$/);
  });

  it('rejects when the SDK fails, without leaking the SDK error', async () => {
    const { sdk } = fakeSdk({ error: new Error('boom api_secret=secret') });
    const storage = new CloudinaryImageStorage(settings, sdk);
    const err = await storage
      .upload(Buffer.from('x'), { publicIdHint: 'a' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImageStorageError);
    expect((err as Error).message).not.toContain('secret');
  });

  it.each([
    ['no result', undefined],
    ['missing url', { public_id: 'a' }],
    ['foreign host', { secure_url: 'https://evil.test/a.jpg', public_id: 'a' }],
    [
      'http url',
      { secure_url: 'http://res.cloudinary.com/demo/a.jpg', public_id: 'a' },
    ],
  ])('rejects an invalid SDK response: %s', async (_l, result) => {
    const { sdk } = fakeSdk({ result: result as UploadResult });
    await expect(
      new CloudinaryImageStorage(settings, sdk).upload(Buffer.from('x'), {
        publicIdHint: 'a',
      }),
    ).rejects.toBeInstanceOf(ImageStorageError);
  });

  it('deletes by public id', async () => {
    const { sdk, destroy } = fakeSdk({});
    await new CloudinaryImageStorage(settings, sdk).delete(
      'orthopro/catalogo/x',
    );
    expect(destroy).toHaveBeenCalledWith('orthopro/catalogo/x', {
      resource_type: 'image',
      invalidate: true,
    });
  });

  it('wraps delete failures in ImageStorageError', async () => {
    const { sdk } = fakeSdk({ destroy: () => Promise.reject(new Error('x')) });
    await expect(
      new CloudinaryImageStorage(settings, sdk).delete('a'),
    ).rejects.toBeInstanceOf(ImageStorageError);
  });
});
