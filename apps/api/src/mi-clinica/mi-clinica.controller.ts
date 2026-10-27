import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-user.js';
import { Roles, RolesGuard } from '../auth/index.js';
import { NoStoreInterceptor } from '../security/index.js';
import { CuentasCobroService } from '../cuentas-cobro/cuentas-cobro.service.js';
import { ComprobanteUploadInterceptor } from '../cuentas-cobro/comprobante-upload.interceptor.js';
import { RegistrarComprobanteDto } from '../cuentas-cobro/dto/registrar-comprobante.dto.js';
import { CreateOrdenDto } from '../pedidos/dto/create-orden.dto.js';
import { CreateMiDoctorDto } from './dto/create-mi-doctor.dto.js';
import { UpdateMiDoctorDto } from './dto/update-mi-doctor.dto.js';
import { MiClinicaService } from './mi-clinica.service.js';

@Controller('mi-clinica')
@UseGuards(RolesGuard)
@Roles('clinica')
@UseInterceptors(NoStoreInterceptor)
export class MiClinicaController {
  constructor(
    private readonly miClinica: MiClinicaService,
    private readonly cuentasCobro: CuentasCobroService,
  ) {}

  @Get('doctores')
  listDoctores(
    @Req() req: AuthenticatedRequest,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.miClinica.listDoctores(
      req.user.id,
      includeInactive === 'true',
    );
  }

  @Post('doctores')
  @HttpCode(HttpStatus.CREATED)
  createDoctor(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMiDoctorDto,
  ) {
    return this.miClinica.createDoctor(req.user.id, dto);
  }

  @Get('doctores/:id')
  getDoctor(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.miClinica.getDoctor(req.user.id, id);
  }

  @Patch('doctores/:id')
  updateDoctor(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMiDoctorDto,
  ) {
    return this.miClinica.updateDoctor(req.user.id, id, dto);
  }

  @Delete('doctores/:id')
  @HttpCode(HttpStatus.OK)
  deactivateDoctor(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.miClinica.deactivateDoctor(req.user.id, id);
  }

  @Get('pacientes')
  listPacientes(
    @Req() req: AuthenticatedRequest,
    @Query('doctorId') doctorId?: string,
  ) {
    if (doctorId) {
      return this.miClinica.listPacientesDelDoctor(req.user.id, doctorId);
    }
    return this.miClinica.listAllPacientes(req.user.id);
  }

  @Post('pacientes')
  @HttpCode(HttpStatus.CREATED)
  createPaciente(
    @Req() req: AuthenticatedRequest,
    @Body() body: { cedula: string; nombre: string },
  ) {
    return this.miClinica.createPaciente(req.user.id, body.cedula, body.nombre);
  }

  @Patch('pacientes/:id')
  updatePaciente(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre: string },
  ) {
    return this.miClinica.updatePaciente(req.user.id, id, body.nombre);
  }

  @Get('servicios')
  listServicios() {
    return this.miClinica.listServicios();
  }

  @Get('ordenes')
  listOrdenes(@Req() req: AuthenticatedRequest) {
    return this.miClinica.listOrdenes(req.user.id);
  }

  @Post('ordenes')
  @HttpCode(HttpStatus.CREATED)
  createOrden(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrdenDto,
  ) {
    return this.miClinica.createOrden(req.user.id, dto);
  }

  @Get('ordenes/:id')
  getOrden(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.miClinica.getOrden(req.user.id, id);
  }

  @Get('cuentas-cobro')
  listCuentasCobro(@Req() req: AuthenticatedRequest) {
    return this.miClinica.listCuentasCobro(req.user.id);
  }

  @Get('cuentas-cobro/:id')
  getCuentaCobro(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.miClinica.getCuentaCobro(req.user.id, id);
  }

  @Get('metodos-pago-bancarios')
  listMetodosPagoBancarios() {
    return this.cuentasCobro.listMetodosPagoBancarios();
  }

  @Post('cuentas-cobro/:id/pagos')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ComprobanteUploadInterceptor)
  async registrarComprobante(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RegistrarComprobanteDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Adjunta el comprobante de pago.');
    }
    // Ownership check first: never store a receipt for another clinic's account.
    await this.miClinica.getCuentaCobro(req.user.id, id);
    return this.cuentasCobro.registrarPagoDesdeClinica(
      id,
      req.user.id,
      dto,
      file,
    );
  }
}
