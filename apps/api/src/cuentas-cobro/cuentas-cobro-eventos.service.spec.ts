import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { CuentasCobroEventosService } from './cuentas-cobro-eventos.service.js';

describe('CuentasCobroEventosService', () => {
  it('entrega a los suscriptores el cambio emitido', async () => {
    const bus = new CuentasCobroEventosService();

    const esperado = firstValueFrom(bus.cambios$);
    bus.emitir('pago', '7');

    await expect(esperado).resolves.toEqual({ tipo: 'pago', cuentaId: '7' });
  });

  it('no guarda estado: sin suscriptores el evento se descarta', () => {
    const bus = new CuentasCobroEventosService();

    expect(() => bus.emitir('creada', '1')).not.toThrow();
  });
});
