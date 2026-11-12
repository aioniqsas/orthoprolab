import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';
import { WhatsappIdentidadService } from './whatsapp-identidad.service.js';

/**
 * Identidad del bot de WhatsApp (T2): servicio de contactos, sin controller.
 * T3 agrega el endpoint interno y consume el servicio exportado.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WhatsappContacto, Clinica, Doctor])],
  providers: [WhatsappIdentidadService],
  exports: [WhatsappIdentidadService],
})
export class WhatsappModule {}
