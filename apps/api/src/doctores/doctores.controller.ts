import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth/index.js';
import { DoctoresService } from './doctores.service.js';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import type { Doctor } from '../usuarios/doctor.entity.js';

@Controller('doctores')
@UseGuards(RolesGuard)
@Roles('administrador')
export class DoctoresController {
  constructor(private readonly doctoresService: DoctoresService) {}

  @Get()
  findAll(@Query('clinicaId') clinicaId?: string): Promise<Doctor[]> {
    return this.doctoresService.findAll(clinicaId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Doctor> {
    const doctor = await this.doctoresService.findOne(id);
    if (!doctor) throw new NotFoundException(`Doctor ${id} no encontrado`);
    return doctor;
  }

  @Post()
  create(@Body() dto: CreateDoctorDto): Promise<Doctor> {
    return this.doctoresService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDoctorDto): Promise<Doctor> {
    return this.doctoresService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string): Promise<Doctor> {
    return this.doctoresService.deactivate(id);
  }
}
