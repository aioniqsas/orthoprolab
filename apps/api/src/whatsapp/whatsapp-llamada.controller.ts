import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { NoStoreInterceptor } from '../security/index.js';
import { WhatsappAuditoriaDto, WhatsappLlamadaDto } from './dto/whatsapp-llamada.dto.js';
import { WhatsappLlamadaService } from './whatsapp-llamada.service.js';

/**
 * Endpoints internos de la opción 0 y la auditoría (T7). Protegidos igual que
 * POST /internal/whatsapp/sesion: @Public() + token de servicio + HMAC por
 * solicitud (S10). No tocan JwtAuthGuard porque no llevan JWT.
 */
@UseInterceptors(NoStoreInterceptor)
@Controller('internal/whatsapp')
export class WhatsappLlamadaController {
  constructor(private readonly llamadas: WhatsappLlamadaService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('llamada')
  registrarLlamada(
    @Body() dto: WhatsappLlamadaDto,
    @Headers('x-whatsapp-service-token') token: string | undefined,
    @Headers('x-whatsapp-timestamp') timestamp?: string,
    @Headers('x-whatsapp-nonce') nonce?: string,
    @Headers('x-whatsapp-signature') signature?: string,
  ): Promise<void> {
    return this.llamadas.registrarLlamada(dto.telefono, token, timestamp, nonce, signature);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('auditoria')
  registrarIntencion(
    @Body() dto: WhatsappAuditoriaDto,
    @Headers('x-whatsapp-service-token') token: string | undefined,
    @Headers('x-whatsapp-timestamp') timestamp?: string,
    @Headers('x-whatsapp-nonce') nonce?: string,
    @Headers('x-whatsapp-signature') signature?: string,
  ): Promise<void> {
    return this.llamadas.registrarIntencion(dto.telefono, dto.intencion, dto.paso, token, timestamp, nonce, signature);
  }
}
