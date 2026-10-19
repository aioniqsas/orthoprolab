import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';

/**
 * Minimal module for the `admin:create` CLI: same env validation, crypto and
 * database wiring as the API, but no HTTP, Redis, queues or throttling.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    CryptoModule,
    DatabaseModule,
    UsuariosModule,
  ],
})
export class AdminCliModule {}
