import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { ContenidoService } from './contenido.service.js';

const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/**
 * Public copy of the site: only the saved values, never defaults. Cache and
 * default throttle match the public catalog list. Changes reach the web app
 * through the catalog SSE stream, which relays the shared event bus.
 */
@Public()
@Controller('contenido')
export class ContenidoPublicoController {
  constructor(private readonly contenido: ContenidoService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  list(): Promise<Record<string, string>> {
    return this.contenido.mapaPublico();
  }
}
