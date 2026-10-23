import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/index.js';
import { Roles, RolesGuard } from '../auth/index.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { PedidosService } from './pedidos.service.js';
import type { Orden } from './orden.entity.js';

@Controller('ordenes')
@UseGuards(RolesGuard)
@Roles('administrador')
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Get()
  findAll(
    @Query('estadoId') estadoId?: string,
    @Query('urgente') urgente?: string,
  ): Promise<Orden[]> {
    return this.pedidos.findAll({
      estadoId: estadoId !== undefined ? Number(estadoId) : undefined,
      urgente: urgente !== undefined ? urgente === 'true' : undefined,
    });
  }

  // Defined BEFORE /:id so NestJS does not treat 'stats' as an id param.
  @Get('stats')
  getStats(): Promise<Record<string, number>> {
    return this.pedidos.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Orden> {
    const orden = await this.pedidos.findOne(id);
    if (!orden) throw new NotFoundException('Orden no encontrada.');
    return orden;
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Orden> {
    return this.pedidos.cambiarEstado(
      id,
      String(dto.estadoId),
      req.user.id,
      dto.observaciones,
    );
  }
}
