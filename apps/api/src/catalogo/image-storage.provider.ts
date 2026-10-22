import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { EnvConfig } from '../config/env.validation.js';
import {
  CloudinaryImageStorage,
  type CloudinarySdk,
} from './cloudinary-image-storage.js';
import {
  NotConfiguredImageStorage,
  type ImageStorage,
} from './image-storage.js';

/** Cloudinary when the three credentials are set, otherwise a 503-ing stub. */
export function createImageStorage(
  config: ConfigService<EnvConfig, true>,
): ImageStorage {
  const cloudName = config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
  const apiKey = config.get('CLOUDINARY_API_KEY', { infer: true });
  const apiSecret = config.get('CLOUDINARY_API_SECRET', { infer: true });
  if (!cloudName || !apiKey || !apiSecret) {
    return new NotConfiguredImageStorage();
  }
  return new CloudinaryImageStorage(
    {
      cloudName,
      apiKey,
      apiSecret,
      folder:
        config.get('CLOUDINARY_FOLDER', { infer: true }) ?? 'orthopro/catalogo',
    },
    cloudinary as unknown as CloudinarySdk,
  );
}
