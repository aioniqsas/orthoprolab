import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { interval, map, merge, type Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../auth/index.js';
import { Roles, RolesGuard } from '../auth/index.js';
import { CuentasCobroService } from './cuentas-cobro.service.js';
import { CuentasCobroEventosService } from './cuentas-cobro-eventos.service.js';
import { CreateCuentaCobroDto } from './dto/create-cuenta-cobro.dto.js';
import { AdjuntarOrdenesDto } from './dto/adjuntar-ordenes.dto.js';
import { EnviarCuentaCobroDto } from './dto/enviar-cuenta-cobro.dto.js';
import { RegistrarPagoDto } from './dto/registrar-pago.dto.js';
import { UpdateCuentaCobroDto } from './dto/update-cuenta-cobro.dto.js';

@Controller('cuentas-cobro')
@UseGuards(RolesGuard)
@Roles('administrador')
export class CuentasCobroController {
  constructor(
    private readonly service: CuentasCobroService,
    private readonly eventos: CuentasCobroEventosService,
  ) {}

  @Get()
  findAll(@Query('doctorId') doctorId?: string) {
    return this.service.findAll(doctorId);
  }

  /** Change trigger for the admin portal: any billing account changed. */
  @Sse('eventos')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  cambios(): Observable<MessageEvent> {
    const SSE_HEARTBEAT_MS = 25_000;
    return merge(
      this.eventos.cambios$.pipe(
        map(
          (cambio): MessageEvent => ({
            type: 'cuenta-cobro',
            data: { tipo: cambio.tipo, cuentaId: cambio.cuentaId },
          }),
        ),
      ),
      interval(SSE_HEARTBEAT_MS).pipe(
        map((): MessageEvent => ({ type: 'ping', data: {} })),
      ),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCuentaCobroDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCuentaCobroDto) {
    return this.service.update(id, dto);
  }

  @Get(':id/ordenes-disponibles')
  findOrdenesDisponibles(@Param('id') id: string) {
    return this.service.findOrdenesDisponibles(id);
  }

  @Post(':id/ordenes')
  @HttpCode(HttpStatus.OK)
  adjuntarOrdenes(@Param('id') id: string, @Body() dto: AdjuntarOrdenesDto) {
    return this.service.adjuntarOrdenes(id, dto);
  }

  @Delete(':id/ordenes/:ordenId')
  desadjuntarOrden(
    @Param('id') id: string,
    @Param('ordenId') ordenId: string,
  ) {
    return this.service.desadjuntarOrden(id, ordenId);
  }

  @Get(':id/pagos')
  async getPagos(@Param('id') id: string) {
    const cuenta = await this.service.findOne(id);
    return cuenta?.pagos ?? [];
  }

  @Post(':id/pagos')
  @HttpCode(HttpStatus.CREATED)
  registrarPago(
    @Param('id') id: string,
    @Body() dto: RegistrarPagoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.registrarPago(id, dto, req.user.id);
  }

  @Patch(':id/pagos/:pagoId/anular')
  anularPago(
    @Param('id') id: string,
    @Param('pagoId') pagoId: string,
  ) {
    return this.service.anularPago(id, pagoId);
  }

  @Post(':id/pdf')
  @HttpCode(HttpStatus.OK)
  generarPdf(@Param('id') id: string) {
    return this.service.generarYGuardarPdf(id);
  }

  @Post(':id/enviar')
  @HttpCode(HttpStatus.CREATED)
  enviarPorEmail(
    @Param('id') id: string,
    @Body() dto: EnviarCuentaCobroDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.enviarPorEmail(id, dto, req.user.id);
  }
}
