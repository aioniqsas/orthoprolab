import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { DoctoresController } from './doctores.controller.js';
import { DoctoresService } from './doctores.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Clinica])],
  controllers: [DoctoresController],
  providers: [DoctoresService],
  exports: [TypeOrmModule, DoctoresService],
})
export class DoctoresModule {}
