import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Servicio } from '../catalogo/servicio.entity.js';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { PacientesModule } from '../pacientes/pacientes.module.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { DetalleOrden } from './detalle-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';
import { PedidosController } from './pedidos.controller.js';
import { PedidosService } from './pedidos.service.js';
import { PedidosEventosService } from './pedidos-eventos.service.js';
import { PdfControlTrabajosService } from './pdf-control-trabajos.service.js';
import { MailerControlTrabajosService } from './mailer-control-trabajos.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Orden,
      DetalleOrden,
      HistorialEstadoOrden,
      EstadoOrden,
      Doctor,
      PacienteDoctor,
      Servicio,
    ]),
    PacientesModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService, PedidosEventosService, PdfControlTrabajosService, MailerControlTrabajosService],
  exports: [TypeOrmModule, PedidosService, PedidosEventosService, PdfControlTrabajosService, MailerControlTrabajosService],
})
export class PedidosModule {}
