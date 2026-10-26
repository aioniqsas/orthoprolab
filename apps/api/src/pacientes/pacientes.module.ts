import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../usuarios/doctor.entity.js';
import { PacienteDoctor } from './paciente-doctor.entity.js';
import { Paciente } from './paciente.entity.js';
import { PacientesController } from './pacientes.controller.js';
import { PacientesService } from './pacientes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente, PacienteDoctor, Doctor])],
  controllers: [PacientesController],
  providers: [PacientesService],
  exports: [TypeOrmModule, PacientesService],
})
export class PacientesModule {}
