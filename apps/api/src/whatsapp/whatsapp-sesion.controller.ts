import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { NoStoreInterceptor } from '../security/index.js';
import { WhatsappSesionDto } from './dto/whatsapp-sesion.dto.js';
import { WhatsappVincularDto } from './dto/whatsapp-vinculacion.dto.js';
import type { ResultadoVinculacion } from './whatsapp-vinculacion.service.js';
import { WhatsappVinculacionService } from './whatsapp-vinculacion.service.js';
import type { SesionBot } from './whatsapp-sesion.service.js';
import { WhatsappSesionService } from './whatsapp-sesion.service.js';

@UseInterceptors(NoStoreInterceptor)
@Controller('internal/whatsapp')
export class WhatsappSesionController {
  constructor(private readonly sesion: WhatsappSesionService, private readonly vinculacion: WhatsappVinculacionService) {}
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('sesion')
  crearSesion(@Body() dto: WhatsappSesionDto, @Headers('x-whatsapp-service-token') token: string | undefined, @Headers('x-whatsapp-timestamp') timestamp?: string, @Headers('x-whatsapp-nonce') nonce?: string, @Headers('x-whatsapp-signature') signature?: string): Promise<SesionBot> {
    return this.sesion.crearSesion(dto.telefono, token, timestamp, nonce, signature);
  }

  /** Canje del OTP de vinculación (T8): mismo blindaje S10 que la sesión. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('vincular')
  vincular(
    @Body() dto: WhatsappVincularDto,
    @Headers('x-whatsapp-service-token') token: string | undefined,
    @Headers('x-whatsapp-timestamp') timestamp?: string,
    @Headers('x-whatsapp-nonce') nonce?: string,
    @Headers('x-whatsapp-signature') signature?: string,
  ): Promise<ResultadoVinculacion> {
    return this.vinculacion.vincular(dto.telefono, token, { timestamp, nonce, signature }, dto.codigo);
  }
}
