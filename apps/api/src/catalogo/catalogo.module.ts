import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../config/env.validation.js';
import { DetalleOrden } from '../pedidos/detalle-orden.entity.js';
import { CatalogoAdminController } from './catalogo-admin.controller.js';
import { CatalogoEventosService } from './catalogo-eventos.service.js';
import { CatalogoPublicoController } from './catalogo-publico.controller.js';
import { EstadoOrden } from './estado-orden.entity.js';
import { IMAGE_STORAGE } from './image-storage.js';
import { createImageStorage } from './image-storage.provider.js';
import { ImagenUploadInterceptor } from './imagen-upload.interceptor.js';
import { PDF_REDIS, PdfService } from './pdf.service.js';
import { Servicio } from './servicio.entity.js';
import { ServiciosService } from './servicios.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoOrden, Servicio, DetalleOrden])],
  controllers: [CatalogoPublicoController, CatalogoAdminController],
  providers: [
    ServiciosService,
    CatalogoEventosService,
    PdfService,
    ImagenUploadInterceptor,
    {
      provide: IMAGE_STORAGE,
      inject: [ConfigService],
      useFactory: createImageStorage,
    },
    {
      provide: PDF_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        new Redis({
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }),
          tls: config.get('REDIS_TLS', { infer: true }) ? {} : undefined,
          maxRetriesPerRequest: 2,
        }),
    },
  ],
  exports: [TypeOrmModule, ServiciosService, CatalogoEventosService],
})
export class CatalogoModule {}
