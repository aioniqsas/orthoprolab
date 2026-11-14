import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/index.js';
import { Roles, RolesGuard } from '../auth/index.js';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';
import { ListOrdenesQueryDto } from './dto/list-ordenes-query.dto.js';
import { CreateOrdenDto } from './dto/create-orden.dto.js';
import { UpdateOrdenDto } from './dto/update-orden.dto.js';
import { PedidosService } from './pedidos.service.js';
import type { Orden } from './orden.entity.js';
import { interval, map, merge, type Observable } from 'rxjs';
import { PedidosEventosService } from './pedidos-eventos.service.js';

@Controller('ordenes')
@UseGuards(RolesGuard)
@Roles('administrador')
export class PedidosController {
  constructor(
    private readonly pedidos: PedidosService,
    private readonly eventos: PedidosEventosService,
  ) {}

  @Get()
  findAll(@Query() query: ListOrdenesQueryDto) {
    return this.pedidos.findAll(query);
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

  /** Change trigger for both portals: clients re-fetch their order lists on every event. */
  @Sse('eventos')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  cambios(): Observable<MessageEvent> {
    const SSE_HEARTBEAT_MS = 25_000;
    return merge(
      this.eventos.cambios$.pipe(
        map((cambio): MessageEvent => ({ type: 'orden', data: { tipo: cambio.tipo } })),
      ),
      interval(SSE_HEARTBEAT_MS).pipe(
        map((): MessageEvent => ({ type: 'ping', data: {} })),
      ),
    );
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

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrdenDto,
  ): Promise<Orden> {
    return this.pedidos.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancelar(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto?: { observaciones?: string },
  ): Promise<Orden> {
    return this.pedidos.cancelar(id, req.user.id, dto?.observaciones);
  }
}
