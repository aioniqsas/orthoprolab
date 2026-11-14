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
  UseGuards,
  Query,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth/index.js';
import { ClinicasService } from './clinicas.service.js';
import { CreateClinicaDto } from './dto/create-clinica.dto.js';
import { UpdateClinicaDto } from './dto/update-clinica.dto.js';
import { ListClinicasQueryDto } from './dto/list-clinicas-query.dto.js';

@Controller('clinicas')
@UseGuards(RolesGuard)
@Roles('administrador')
export class ClinicasController {
  constructor(private readonly clinicas: ClinicasService) {}

  @Get()
  findAll(@Query() query: ListClinicasQueryDto) {
    return this.clinicas.findAll(query.q, query.page, query.size, {
      sort: query.sort,
      order: query.order,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateClinicaDto) {
    return this.clinicas.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinicas.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClinicaDto) {
    return this.clinicas.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.clinicas.remove(id);
  }
}
