import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnv } from './config/env.validation.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { DatabaseModule } from './database/database.module.js';
import { UsuariosApiModule } from './usuarios/usuarios-api.module.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';
import { ContenidoModule } from './contenido/contenido.module.js';
import { ClinicasModule } from './clinicas/clinicas.module.js';
import { CuentasCobroModule } from './cuentas-cobro/cuentas-cobro.module.js';
import { DoctoresModule } from './doctores/doctores.module.js';
import { MiClinicaModule } from './mi-clinica/mi-clinica.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { HealthModule } from './health/health.module.js';
import { SecurityModule } from './security/security.module.js';
import { AuthModule } from './auth/auth.module.js';
import { WhatsappModule } from './whatsapp/whatsapp.module.js';

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
    UsuariosApiModule,
    ClinicasModule,
    PacientesModule,
    CatalogoModule,
    ContenidoModule,
    PedidosModule,
    DoctoresModule,
    MiClinicaModule,
    CuentasCobroModule,
    QueuesModule,
    HealthModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
