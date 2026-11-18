import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { SecurityModule } from '../security/security.module.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';
import { WhatsappIdentidadService } from './whatsapp-identidad.service.js';
import { WhatsappLlamada } from './whatsapp-llamada.entity.js';
import { WhatsappLlamadaController } from './whatsapp-llamada.controller.js';
import { WhatsappLlamadaService } from './whatsapp-llamada.service.js';
import { WhatsappSesionController } from './whatsapp-sesion.controller.js';
import { WhatsappSesionService } from './whatsapp-sesion.service.js';
import { WhatsappSesionAuditoria } from './whatsapp-sesion-auditoria.entity.js';
import { WhatsappVinculacionService } from './whatsapp-vinculacion.service.js';

/**
 * Identidad del bot de WhatsApp: T2 el servicio de contactos, T3 el endpoint
 * interno que acuña el JWT corto de la cuenta designada (S7). AuthModule
 * aporta el JwtService ya configurado con JWT_SECRET y
 * ACCESS_TOKEN_TTL_SECONDS, para que el token del bot sea idéntico al del
 * portal y pase por el mismo guard.
 */
@Module({
  imports: [
    AuthModule,
    SecurityModule,
    TypeOrmModule.forFeature([WhatsappContacto, Clinica, Doctor, Usuario, WhatsappSesionAuditoria, WhatsappLlamada]),
  ],
  controllers: [WhatsappSesionController, WhatsappLlamadaController],
  providers: [WhatsappIdentidadService, WhatsappSesionService, WhatsappLlamadaService, WhatsappVinculacionService],
  exports: [WhatsappIdentidadService, WhatsappVinculacionService],
})
export class WhatsappModule {}
