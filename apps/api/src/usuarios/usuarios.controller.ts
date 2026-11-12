import {
  Body,
  Controller,
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
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@UseGuards(RolesGuard)
@Roles('administrador')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.usuarios.findAll(q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuarios.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuarios.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuarios.update(id, dto);
  }

  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usuarios.resetPassword(id, dto);
  }

  @Post(':id/regenerar-credenciales')
  @HttpCode(HttpStatus.OK)
  regenerarCredenciales(@Param('id') id: string) {
    return this.usuarios.regenerarCredenciales(id);
  }
}
