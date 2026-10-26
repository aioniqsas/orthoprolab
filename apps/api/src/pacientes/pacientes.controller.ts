import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth/index.js';
import { PacientesService } from './pacientes.service.js';

@Controller('pacientes')
@UseGuards(RolesGuard)
@Roles('administrador', 'clinica')
export class PacientesController {
  constructor(private readonly pacientes: PacientesService) {}

  @Get('buscar')
  async buscar(@Query('cedula') cedula: string) {
    if (!cedula?.trim()) {
      throw new NotFoundException('Cédula requerida.');
    }
    const result = await this.pacientes.findByCedula(cedula.trim());
    if (!result) throw new NotFoundException('Paciente no encontrado.');
    return result;
  }
}
