import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleOrden } from './detalle-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Orden, DetalleOrden, HistorialEstadoOrden]),
  ],
  exports: [TypeOrmModule],
})
export class PedidosModule {}
