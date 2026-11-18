import { Body, Controller, Get, Patch, UseInterceptors } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator.js';
import { NoStoreInterceptor } from '../security/index.js';
import { ConfiguracionBotService } from './configuracion-bot.service.js';
import { PatchConfiguracionBotDto } from './dto/configuracion-bot.dto.js';

@Roles('administrador')
@UseInterceptors(NoStoreInterceptor)
@Controller('admin/configuracion/bot')
export class ConfiguracionBotController {
  constructor(private readonly configuracion: ConfiguracionBotService) {}

  @Get()
  get(): Promise<{ nombre: string }> {
    return this.configuracion.getNombre();
  }

  @Patch()
  guardar(@Body() dto: PatchConfiguracionBotDto): Promise<{ nombre: string }> {
    return this.configuracion.guardarNombre(dto.nombre);
  }
}
