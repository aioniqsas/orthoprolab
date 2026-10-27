import { randomBytes } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { CloudinarySdk } from '../catalogo/cloudinary-image-storage.js';
import { isCloudinaryUrl } from '../catalogo/image-storage.js';
import type { EnvConfig } from '../config/env.validation.js';

/** Stores payment receipts (PDF or image) in Cloudinary. */
@Injectable()
export class ComprobanteStorageService {
  private readonly logger = new Logger(ComprobanteStorageService.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async upload(buffer: Buffer, originalName: string): Promise<string> {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'El almacenamiento de comprobantes no está configurado.',
      );
    }

    const sdk = cloudinary as unknown as CloudinarySdk;
    sdk.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const base = originalName
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'comprobante';
    const publicId = `${base}-${randomBytes(8).toString('hex')}`;

    const url = await new Promise<string>((resolve, reject) => {
      const stream = sdk.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'orthopro/comprobantes',
          public_id: publicId,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary receipt upload failed (${error.name})`);
            return reject(new Error('Receipt upload failed'));
          }
          const secureUrl = result?.secure_url;
          if (!secureUrl || !isCloudinaryUrl(secureUrl)) {
            this.logger.error('Cloudinary returned an unexpected response');
            return reject(new Error('Unexpected storage response'));
          }
          resolve(secureUrl);
        },
      );
      stream.on('error', () => reject(new Error('Receipt upload stream error')));
      stream.end(buffer);
    });

    return url;
  }
}
