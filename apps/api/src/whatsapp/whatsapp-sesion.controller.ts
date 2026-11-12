import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { NoStoreInterceptor } from '../security/index.js';
import { WhatsappSesionDto } from './dto/whatsapp-sesion.dto.js';
import type { SesionBot } from './whatsapp-sesion.service.js';
import { WhatsappSesionService } from './whatsapp-sesion.service.js';

/**
 * POST /internal/whatsapp/sesion (S7): el bot intercambia el secreto de
 * servicio por el JWT corto de la cuenta que la clínica designó. Abierto solo
 * con @Public + el header X-Whatsapp-Service-Token; la tasa global del
 * throttler aplica sin reglas propias (el límite por número es T7).
 */
@UseInterceptors(NoStoreInterceptor)
@Controller('internal/whatsapp')
export class WhatsappSesionController {
  constructor(private readonly sesion: WhatsappSesionService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('sesion')
  crearSesion(
    @Body() dto: WhatsappSesionDto,
    @Headers('x-whatsapp-service-token') tokenServicio: string | undefined,
  ): Promise<SesionBot> {
    return this.sesion.crearSesion(dto.telefono, tokenServicio);
  }
}
