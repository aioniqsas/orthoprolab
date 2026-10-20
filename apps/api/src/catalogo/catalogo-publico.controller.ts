import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator.js';
import { PdfService } from './pdf.service.js';
import { ServiciosService, type ServicioPublico } from './servicios.service.js';

const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/** Public catalog: only { id, slug, nombre, descripcion, imagenUrl } of active services. */
@Public()
@Controller('catalogo')
export class CatalogoPublicoController {
  constructor(
    private readonly servicios: ServiciosService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('servicios')
  @Header('Cache-Control', PUBLIC_CACHE)
  list(): Promise<ServicioPublico[]> {
    return this.servicios.listPublic();
  }

  @Get('servicios/:slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  detail(@Param('slug') slug: string): Promise<ServicioPublico> {
    return this.servicios.findPublicBySlug(slug);
  }

  @Get('pdf')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="catalogo-orthopro-lab.pdf"')
  @Header('Cache-Control', 'no-store')
  async getCatalogPdf(
    @Res({ passthrough: true }) _res: Response,
  ): Promise<StreamableFile> {
    const pdf = await this.pdfService.getCatalogPdf();
    return new StreamableFile(pdf);
  }
}
