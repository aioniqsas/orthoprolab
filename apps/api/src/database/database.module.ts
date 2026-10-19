import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { EnvConfig } from '../config/env.validation.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        type: 'postgres' as const,
        host: config.get('DATABASE_HOST', { infer: true }),
        port: config.get('DATABASE_PORT', { infer: true }),
        username: config.get('DATABASE_USER', { infer: true }),
        password: config.get('DATABASE_PASSWORD', { infer: true }),
        database: config.get('DATABASE_NAME', { infer: true }),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        retryAttempts: 5,
        retryDelay: 3000,
        connectTimeoutMS: 5000,
        extra: { max: 10, idleTimeoutMillis: 30000 },
      }),
    }),
  ],
})
export class DatabaseModule {}
