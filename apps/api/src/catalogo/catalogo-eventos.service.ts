import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type CatalogoCambio =
  | 'creado'
  | 'actualizado'
  | 'eliminado'
  | 'imagen';

/**
 * In-memory bus for catalog mutations. The public SSE endpoint streams it and
 * the web app revalidates its cache on every event.
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
