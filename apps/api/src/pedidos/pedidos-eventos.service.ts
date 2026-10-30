import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type OrdenCambio = 'creada' | 'estado' | 'actualizada';

export interface OrdenEvento {
  tipo: OrdenCambio;
  ordenId?: string;
  clinicaId?: string;
}

/**
 * In-memory bus for order mutations. Both portals subscribe via SSE and
 * re-fetch their (role-filtered) lists on every event.
 *
 * shortcut: one process only — with several API replicas use Redis pub/sub.
 */
@Injectable()
export class PedidosEventosService {
  private readonly cambios = new Subject<OrdenEvento>();

  readonly cambios$ = this.cambios.asObservable();

  emitir(tipo: OrdenCambio, ordenId?: string, clinicaId?: string): void {
    this.cambios.next({ tipo, ordenId, clinicaId });
  }
}
