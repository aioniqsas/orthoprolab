import { describe, expect, it, vi } from 'vitest';
import { CuentasCobroService } from './cuentas-cobro.service.js';

/**
 * The available-orders query is the only contract here worth pinning: an order
 * already attached to an active billing account must never come back as
 * available, and that includes the account being edited.
 */
function crearServicio() {
  const subConsultas: { where: unknown[]; andWhere: unknown[] } = {
    where: [],
    andWhere: [],
  };

  const subBuilder = {
    select: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn((...args: unknown[]) => {
      subConsultas.where.push(args);
      return subBuilder;
    }),
    andWhere: vi.fn((...args: unknown[]) => {
      subConsultas.andWhere.push(args);
      return subBuilder;
    }),
    getQuery: () => 'SELECT cco.orden_id FROM cuenta_cobro_orden cco',
    getParameters: () => ({ anulada: 'anulada' }),
  };

  const parametros: Record<string, unknown>[] = [];
  const outerBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    setParameters: vi.fn((params: Record<string, unknown>) => {
      parametros.push(params);
      return outerBuilder;
    }),
    orderBy: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([{ id: '9' }]),
  };

  const servicio = new CuentasCobroService(
    { findOne: vi.fn().mockResolvedValue({ id: '3', clinicaId: '2' }) } as never,
    { createQueryBuilder: vi.fn(() => subBuilder) } as never,
    {} as never,
    { createQueryBuilder: vi.fn(() => outerBuilder) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { emitir: vi.fn() } as never,
  );

  return { servicio, subConsultas, parametros, outerBuilder };
}

describe('findOrdenesDisponibles', () => {
  it('excluye las órdenes adjuntas a cualquier cuenta activa, incluida la actual', async () => {
    const { servicio, subConsultas } = crearServicio();

    await expect(servicio.findOrdenesDisponibles('3')).resolves.toEqual([{ id: '9' }]);

    const condiciones = [...subConsultas.where, ...subConsultas.andWhere]
      .map((args) => String((args as unknown[])[0]))
      .join(' ');
    expect(condiciones).toContain('anulada');
    // Regresión: filtrar por `cuentaCobroId != :cuentaCobroId` volvía a ofrecer
    // las órdenes ya adjuntas a la cuenta abierta.
    expect(condiciones).not.toContain('cuentaCobroId');
  });

  it('conserva el filtro por clínica al pasar los parámetros al query externo', async () => {
    const { servicio, parametros } = crearServicio();

    await servicio.findOrdenesDisponibles('3');

    expect(parametros.at(-1)).toEqual({ anulada: 'anulada', clinicaId: '2' });
  });
});
