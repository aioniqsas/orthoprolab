import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PacienteDoctor } from './paciente-doctor.entity.js';
import { Paciente } from './paciente.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente, PacienteDoctor])],
  exports: [TypeOrmModule],
})
export class PacientesModule {}
