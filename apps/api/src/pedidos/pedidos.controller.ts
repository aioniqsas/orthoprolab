import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/index.js';
import { Roles, RolesGuard } from '../auth/index.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { CreateOrdenDto } from './dto/create-orden.dto.js';
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

  // Defined BEFORE /:id so NestJS does not treat 'stats' / 'estados' as id params.
  @Get('stats')
  getStats(): Promise<Record<string, number>> {
    return this.pedidos.getStats();
  }

  @Get('estados')
  listEstados() {
    return this.pedidos.listEstados();
  }

  @Get('doctores')
  listDoctores() {
    return this.pedidos.listDoctores();
  }

  @Get('doctores/:doctorId/pacientes')
  listPacientesPorDoctor(@Param('doctorId') doctorId: string) {
    return this.pedidos.listPacientesPorDoctor(doctorId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateOrdenDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Orden> {
    return this.pedidos.create(dto, req.user.id);
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
