import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoOrden } from './estado-orden.entity.js';
import { Servicio } from './servicio.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoOrden, Servicio])],
  exports: [TypeOrmModule],
})
export class CatalogoModule {}
