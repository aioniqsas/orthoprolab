import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnv } from './config/env.validation.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { DatabaseModule } from './database/database.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';
import { ContenidoModule } from './contenido/contenido.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { HealthModule } from './health/health.module.js';
import { SecurityModule } from './security/security.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    CryptoModule,
    SecurityModule,
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    PacientesModule,
    CatalogoModule,
    ContenidoModule,
    PedidosModule,
    QueuesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
