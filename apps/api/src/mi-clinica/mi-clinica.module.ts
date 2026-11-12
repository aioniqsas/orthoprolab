import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaCobro } from '../cuentas-cobro/cuenta-cobro.entity.js';
import { CuentasCobroModule } from '../cuentas-cobro/cuentas-cobro.module.js';
import { PacientesModule } from '../pacientes/pacientes.module.js';
import { Orden } from '../pedidos/orden.entity.js';
import { PedidosModule } from '../pedidos/pedidos.module.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { MiClinicaController } from './mi-clinica.controller.js';
import { MiClinicaService } from './mi-clinica.service.js';
import { WhatsappModule } from '../whatsapp/whatsapp.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Doctor, Usuario, Orden, CuentaCobro, Clinica]),
    CuentasCobroModule,
    PedidosModule,
    PacientesModule,
    WhatsappModule,
  ],
  controllers: [MiClinicaController],
  providers: [MiClinicaService],
  exports: [MiClinicaService],
})
export class MiClinicaModule {}
