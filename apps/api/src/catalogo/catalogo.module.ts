import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleOrden } from '../pedidos/detalle-orden.entity.js';
import { CatalogoAdminController } from './catalogo-admin.controller.js';
import { CatalogoPublicoController } from './catalogo-publico.controller.js';
import { EstadoOrden } from './estado-orden.entity.js';
import { IMAGE_STORAGE } from './image-storage.js';
import { createImageStorage } from './image-storage.provider.js';
import { ImagenUploadInterceptor } from './imagen-upload.interceptor.js';
import { Servicio } from './servicio.entity.js';
import { ServiciosService } from './servicios.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoOrden, Servicio, DetalleOrden])],
  controllers: [CatalogoPublicoController, CatalogoAdminController],
  providers: [
    ServiciosService,
    ImagenUploadInterceptor,
    {
      provide: IMAGE_STORAGE,
      inject: [ConfigService],
      useFactory: createImageStorage,
    },
  ],
  exports: [TypeOrmModule, ServiciosService],
})
export class CatalogoModule {}
