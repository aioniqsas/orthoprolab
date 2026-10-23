import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { DetalleOrden } from './detalle-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';
import { PedidosController } from './pedidos.controller.js';
import { PedidosService } from './pedidos.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Orden,
      DetalleOrden,
      HistorialEstadoOrden,
      EstadoOrden,
    ]),
  ],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [TypeOrmModule, PedidosService],
})
export class PedidosModule {}
