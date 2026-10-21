import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  Sse,
  StreamableFile,
  type MessageEvent,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { interval, map, merge, type Observable } from 'rxjs';
import { Public } from '../auth/public.decorator.js';
import { CatalogoEventosService } from './catalogo-eventos.service.js';
import { PdfService } from './pdf.service.js';
import { ServiciosService, type ServicioPublico } from './servicios.service.js';

const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';
/** Keeps proxies and browsers from closing an idle SSE connection. */
const SSE_HEARTBEAT_MS = 25_000;

/** Public catalog: only { id, slug, nombre, descripcion, imagenUrl } of active services. */
@Public()
@Controller('catalogo')
export class CatalogoPublicoController {
  constructor(
    private readonly servicios: ServiciosService,
    private readonly pdfService: PdfService,
    private readonly eventos: CatalogoEventosService,
  ) {}

  /** Change trigger for `apps/web`: the client only needs to know "something changed". */
  @Sse('eventos')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  cambios(): Observable<MessageEvent> {
    return merge(
      this.eventos.cambios$.pipe(
        map((cambio): MessageEvent => ({ type: 'catalogo', data: cambio })),
      ),
      interval(SSE_HEARTBEAT_MS).pipe(
        map((): MessageEvent => ({ type: 'ping', data: {} })),
      ),
    );
  }

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
