import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaCobro } from '../cuentas-cobro/cuenta-cobro.entity.js';
import { Orden } from '../pedidos/orden.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { MiClinicaController } from './mi-clinica.controller.js';
import { MiClinicaService } from './mi-clinica.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Usuario, Orden, CuentaCobro])],
  controllers: [MiClinicaController],
  providers: [MiClinicaService],
  exports: [MiClinicaService],
})
export class MiClinicaModule {}
