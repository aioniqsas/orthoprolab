import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

/** What changed in a billing account; the portals only need "something moved". */
export type CambioCuentaCobro =
  | 'creada'
  | 'actualizada'
  | 'pago'
  | 'pdf'
  | 'enviada';

/**
 * In-memory bus for billing-account mutations. Two SSE endpoints stream it: one
 * for the admin portal and one for the clinic portal, which filters by clinic on
 * its own queries.
 *
 * shortcut: one process only — with several API replicas use Redis pub/sub.
 */
@Injectable()
export class CuentasCobroEventosService {
  private readonly cambios = new Subject<{
    tipo: CambioCuentaCobro;
    cuentaId: string;
  }>();

  readonly cambios$ = this.cambios.asObservable();

  emitir(tipo: CambioCuentaCobro, cuentaId: string): void {
    this.cambios.next({ tipo, cuentaId });
  }
}
