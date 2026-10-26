import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-user.js';
import { Roles, RolesGuard } from '../auth/index.js';
import { NoStoreInterceptor } from '../security/index.js';
import { CreateMiDoctorDto } from './dto/create-mi-doctor.dto.js';
import { UpdateMiDoctorDto } from './dto/update-mi-doctor.dto.js';
import { MiClinicaService } from './mi-clinica.service.js';

@Controller('mi-clinica')
@UseGuards(RolesGuard)
@Roles('clinica')
@UseInterceptors(NoStoreInterceptor)
export class MiClinicaController {
  constructor(private readonly miClinica: MiClinicaService) {}

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

  @Get('ordenes')
  listOrdenes(@Req() req: AuthenticatedRequest) {
    return this.miClinica.listOrdenes(req.user.id);
  }

  @Get('cuentas-cobro')
  listCuentasCobro(@Req() req: AuthenticatedRequest) {
    return this.miClinica.listCuentasCobro(req.user.id);
  }
}
