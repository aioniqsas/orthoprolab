import { randomBytes } from 'node:crypto';
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
void PassportModule;
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CryptoService } from '../crypto/crypto.service.js';
import { PasswordService } from '../crypto/password.service.js';
import { QueuesModule } from '../queues/queues.module.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Rol } from '../usuarios/rol.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { SesionRefresco } from '../auth/sesion-refresco.entity.js';
import { WhatsappLlamada } from './whatsapp-llamada.entity.js';
import { WhatsappSesionService } from './whatsapp-sesion.service.js';
import { WhatsappModule } from './whatsapp.module.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';
import { WhatsappSesionAuditoria } from './whatsapp-sesion-auditoria.entity.js';

/**
 * S10/S7: el grafo real de WhatsappModule debe resolver THROTTLER_REDIS.
 * Antes SecurityModule no exportaba el almacen Redis y el @Optional() dejaba
 * `undefined`: sesión, callback y auditoría respondían 503 permanentes.
 */

const repoFalso = () => ({
  findOneBy: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
  createQueryBuilder: vi.fn(),
});

// Global para que lo vean los módulos importados por WhatsappModule.
@Global()
@Module({
  providers: [
    { provide: DataSource, useValue: { manager: {}, entityMetadatas: [], options: { type: 'postgres' }, getRepository: () => repoFalso() } },
    {
      provide: CryptoService,
      useValue: new CryptoService({
        encryptionKey: randomBytes(32).toString('base64'),
        blindIndexKey: randomBytes(32).toString('base64'),
      }),
    },
    { provide: PasswordService, useValue: { hash: vi.fn() } },
  ],
  exports: [DataSource, CryptoService, PasswordService],
})
class ReposFalsosModule {}

describe('WhatsappModule: resolución de THROTTLER_REDIS', () => {
  it('el servicio de sesión recibe un cliente Redis definido', async () => {
    const configValues: Record<string, unknown> = {
      NODE_ENV: 'test',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: 6380,
      REDIS_TLS: false,
      JWT_SECRET: randomBytes(32).toString('base64'),
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 7,
      COOKIE_SAMESITE: 'lax',
      ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      BLIND_INDEX_KEY: randomBytes(32).toString('base64'),
      BCRYPT_COST: 10,
      LOGIN_MAX_ATTEMPTS: 5,
      LOGIN_LOCK_SECONDS: 300,
    };
    const config = {
      get: (key: string) => configValues[key],
    } as unknown as ConfigService;

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), ReposFalsosModule, WhatsappModule, QueuesModule],
    })
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();

    const sesion = moduleRef.get(WhatsappSesionService, { strict: false });
    expect((sesion as unknown as { redis: unknown }).redis).toBeDefined();
    await moduleRef.close();
  });
});
