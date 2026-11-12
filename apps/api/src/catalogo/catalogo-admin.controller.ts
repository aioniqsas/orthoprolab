import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../auth/roles.decorator.js';
import { NoStoreInterceptor } from '../security/index.js';
import { CreateServicioDto, UpdateServicioDto } from './dto/servicio.dto.js';
import { ImagenUploadInterceptor } from './imagen-upload.interceptor.js';
import { ServicioIdPipe } from './servicio-id.pipe.js';
import { ServiciosService, type ServicioAdmin } from './servicios.service.js';

@Roles('administrador')
@UseInterceptors(NoStoreInterceptor)
@Controller('admin/catalogo/servicios')
export class CatalogoAdminController {
  constructor(private readonly servicios: ServiciosService) {}

  @Get()
  list(@Query('q') q?: string): Promise<ServicioAdmin[]> {
    return this.servicios.listAdmin(q);
  }

  @Post()
  create(@Body() dto: CreateServicioDto): Promise<ServicioAdmin> {
    return this.servicios.create(dto);
  }

  @Get(':id')
  get(@Param('id', ServicioIdPipe) id: string): Promise<ServicioAdmin> {
    return this.servicios.getAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id', ServicioIdPipe) id: string,
    @Body() dto: UpdateServicioDto,
  ): Promise<ServicioAdmin> {
    return this.servicios.update(id, dto);
  }

  /** 204 when physically deleted; 200 + the deactivated resource when it has order history. */
  @Delete(':id')
  async remove(
    @Param('id', ServicioIdPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ServicioAdmin | undefined> {
    const result = await this.servicios.remove(id);
    if (result.kind === 'deleted') {
      res.status(204);
      return undefined;
    }
    res.status(200);
    return result.servicio;
  }

  @Post(':id/imagen')
  @HttpCode(200)
  @UseInterceptors(ImagenUploadInterceptor)
  upload(
    @Param('id', ServicioIdPipe) id: string,
    @Req() req: Request & { file?: Express.Multer.File },
  ): Promise<ServicioAdmin> {
    if (!req.file) {
      throw new BadRequestException('Falta el archivo en el campo "imagen".');
    }
    return this.servicios.setImage(id, req.file.buffer);
  }
}
