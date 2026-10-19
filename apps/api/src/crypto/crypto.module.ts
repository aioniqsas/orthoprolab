import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation.js';
import { configureCrypto } from './crypto.registry.js';
import { CryptoService } from './crypto.service.js';
import { PasswordService } from './password.service.js';

@Global()
@Module({
  providers: [
    {
      provide: CryptoService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const service = new CryptoService({
          encryptionKey: config.get('ENCRYPTION_KEY', { infer: true }),
          blindIndexKey: config.get('BLIND_INDEX_KEY', { infer: true }),
        });
        // Entities/transformers cannot use DI: expose the instance to them.
        configureCrypto(service);
        return service;
      },
    },
    {
      provide: PasswordService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        new PasswordService(config.get('BCRYPT_COST', { infer: true })),
    },
  ],
  exports: [CryptoService, PasswordService],
})
export class CryptoModule {}
