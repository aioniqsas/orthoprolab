import { Body, Controller, Get, Put, UseInterceptors } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator.js';
import { NoStoreInterceptor } from '../security/index.js';
import { ContenidoService, type ContenidoAdmin } from './contenido.service.js';
import { PutContenidoDto } from './dto/contenido.dto.js';

@Roles('administrador')
@UseInterceptors(NoStoreInterceptor)
@Controller('admin/contenido')
export class ContenidoAdminController {
  constructor(private readonly contenido: ContenidoService) {}

  @Get()
  list(): Promise<ContenidoAdmin> {
    return this.contenido.listAdmin();
  }

  /** Body: `{ valores: { "<clave>": "<valor>" } }`; empty string deletes the row. */
  @Put()
  save(@Body() dto: PutContenidoDto): Promise<ContenidoAdmin> {
    return this.contenido.guardar(dto.valores);
  }
}
