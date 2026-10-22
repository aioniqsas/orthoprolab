import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoModule } from '../catalogo/catalogo.module.js';
import { ContenidoAdminController } from './contenido-admin.controller.js';
import { ContenidoPublicoController } from './contenido-publico.controller.js';
import { ContenidoWeb } from './contenido.entity.js';
import { ContenidoService } from './contenido.service.js';

// CatalogoModule provides the shared change bus (CatalogoEventosService).
@Module({
  imports: [TypeOrmModule.forFeature([ContenidoWeb]), CatalogoModule],
  controllers: [ContenidoPublicoController, ContenidoAdminController],
  providers: [ContenidoService],
})
export class ContenidoModule {}
