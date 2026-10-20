import { randomBytes } from 'node:crypto';
import type { Writable } from 'node:stream';
import { Logger } from '@nestjs/common';
import {
  ImageStorageError,
  isCloudinaryUrl,
  type ImageStorage,
} from './image-storage.js';

type UploadResult = { secure_url?: string; public_id?: string } | undefined;

/** The slice of the cloudinary v2 SDK this adapter uses (mockable in tests). */
export interface CloudinarySdk {
  config(options: {
    cloud_name: string;
    api_key: string;
    api_secret: string;
    secure: boolean;
  }): unknown;
  uploader: {
    upload_stream(
      options: Record<string, unknown>,
      callback: (error: Error | undefined, result: UploadResult) => void,
    ): Writable;
    destroy(
      publicId: string,
      options: { resource_type: 'image'; invalidate: boolean },
    ): Promise<unknown>;
  };
}

export interface CloudinarySettings {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

const hintOf = (hint: string): string =>
  hint
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '') || 'servicio';

export class CloudinaryImageStorage implements ImageStorage {
  private readonly logger = new Logger(CloudinaryImageStorage.name);

  constructor(
    private readonly settings: CloudinarySettings,
    private readonly sdk: CloudinarySdk,
  ) {
    sdk.config({
      cloud_name: settings.cloudName,
      api_key: settings.apiKey,
      api_secret: settings.apiSecret,
      secure: true,
    });
  }

  upload(
    buffer: Buffer,
    options: { publicIdHint: string },
  ): Promise<{ url: string; publicId: string }> {
    // Unique id per upload: replacing an image never overwrites a cached CDN asset.
    const publicId = `${hintOf(options.publicIdHint)}-${randomBytes(8).toString('hex')}`;
    return new Promise((resolve, reject) => {
      const stream = this.sdk.uploader.upload_stream(
        {
          folder: this.settings.folder,
          public_id: publicId,
          resource_type: 'image',
          overwrite: false,
          unique_filename: true,
          use_filename: false,
        },
        (error, result) => {
          if (error) {
            // The SDK error can carry request details: log the type only.
            this.logger.error(`Cloudinary upload failed (${error.name})`);
            return reject(new ImageStorageError('Image upload failed'));
          }
          const url = result?.secure_url;
          const id = result?.public_id;
          if (!url || !id || !isCloudinaryUrl(url)) {
            this.logger.error('Cloudinary returned an unexpected response');
            return reject(new ImageStorageError('Unexpected storage response'));
          }
          resolve({ url, publicId: id });
        },
      );
      stream.on('error', () =>
        reject(new ImageStorageError('Image upload failed')),
      );
      stream.end(buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    try {
      await this.sdk.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });
    } catch {
      throw new ImageStorageError('Image delete failed');
    }
  }
}
