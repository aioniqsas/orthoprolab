import { BadRequestException } from '@nestjs/common';
import { CuentasCobroService } from './cuentas-cobro.service.js';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { Orden } from '../pedidos/orden.entity.js';

/**
 * Servicio sobre una transacción falsa. `estadoCodigo` es el estado de la orden
 * que se intenta adjuntar.
 */
function montar(estadoCodigo: string) {
  const guardadas: unknown[] = [];

  const cadenaConsulta = {
    innerJoin: () => cadenaConsulta,
    where: () => cadenaConsulta,
    andWhere: () => cadenaConsulta,
    getOne: async () => null,
  };

  const em = {
    findOne: vi.fn(async (entidad: unknown) => {
      if (entidad === CuentaCobro) {
        return { id: '3', clinicaId: '2', estado: 'borrador', total: '0.00' };
      }
      if (entidad === Orden) {
        return { id: '9', doctorId: '1', estado: { codigo: estadoCodigo, nombre: 'Terminada' } };
      }
      return null;
    }),
    query: vi.fn(async () => [{ belongs: true }]),
    createQueryBuilder: () => cadenaConsulta,
    create: vi.fn((_entidad: unknown, valor: unknown) => valor),
    save: vi.fn(async (valor: unknown) => {
      guardadas.push(valor);
      return valor;
    }),
    find: vi.fn(async () => []),
    update: vi.fn(async () => undefined),
  };

  const service = new CuentasCobroService(
    { findOne: vi.fn(async () => ({ id: '3', estado: 'borrador', total: '0.00' })) } as never,
    { find: vi.fn(async () => []) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { transaction: (cb: (m: unknown) => unknown) => cb(em) } as never,
    {} as never,
    {} as never,
    {} as never,
    { generate: vi.fn(async () => Buffer.from('pdf')) } as never,
  );

  return { service, guardadas };
}

describe('CuentasCobroService.adjuntarOrdenes · gate de estado', () => {
  it('rechaza una orden que no está terminada', async () => {
    const { service } = montar('en_proceso');

    await expect(
      service.adjuntarOrdenes('3', { ordenes: [{ ordenId: 9, valor: 100 }] } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una orden cancelada', async () => {
    const { service } = montar('cancelada');

    await expect(
      service.adjuntarOrdenes('3', { ordenes: [{ ordenId: 9, valor: 100 }] } as never),
    ).rejects.toThrow(/Solo se cobran órdenes terminadas/);
  });

  it('acepta una orden terminada', async () => {
    const { service, guardadas } = montar('terminada');

    await service.adjuntarOrdenes('3', { ordenes: [{ ordenId: 9, valor: 100 }] } as never);

    expect(guardadas).toEqual(
      expect.arrayContaining([expect.objectContaining({ ordenId: '9', valorSnapshot: '100.00' })]),
    );
  });
});
