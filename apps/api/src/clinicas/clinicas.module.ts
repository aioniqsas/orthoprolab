import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerAuthService } from '../auth/mailer-auth.service.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Rol } from '../usuarios/rol.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { ClinicasController } from './clinicas.controller.js';
import { ClinicasService } from './clinicas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Clinica, Doctor, Usuario, Rol])],
  providers: [ClinicasService, MailerAuthService],
  controllers: [ClinicasController],
})
export class ClinicasModule {}
