import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type CatalogoCambio =
  | 'creado'
  | 'actualizado'
  | 'eliminado'
  | 'imagen'
  | 'contenido';

/**
 * In-memory bus for catalog and content mutations (the content module imports
 * it from CatalogoModule, so both share one stream). The public SSE endpoint
 * streams it and the web app revalidates its cache on every event.
 *
 * shortcut: one process only — with several API replicas use Redis pub/sub.
 */
@Injectable()
export class CatalogoEventosService {
  private readonly cambios = new Subject<{ tipo: CatalogoCambio }>();

  readonly cambios$ = this.cambios.asObservable();

  emitir(tipo: CatalogoCambio): void {
    this.cambios.next({ tipo });
  }
}
