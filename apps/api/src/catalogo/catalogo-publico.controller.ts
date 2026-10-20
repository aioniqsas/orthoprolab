import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { ServiciosService, type ServicioPublico } from './servicios.service.js';

const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/** Public catalog: only { id, slug, nombre, descripcion, imagenUrl } of active services. */
@Public()
@Controller('catalogo/servicios')
export class CatalogoPublicoController {
  constructor(private readonly servicios: ServiciosService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  list(): Promise<ServicioPublico[]> {
    return this.servicios.listPublic();
  }

  @Get(':slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  detail(@Param('slug') slug: string): Promise<ServicioPublico> {
    return this.servicios.findPublicBySlug(slug);
  }
}
