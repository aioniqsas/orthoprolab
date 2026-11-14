import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { Paciente } from '../pacientes/paciente.entity.js';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';

const dto = {
  doctorId: '7',
  pacienteId: 42,
  detalles: [
    { servicio: 'Corona de zirconia', cantidad: 1, dientes: [11], colorDiente: 'A2' },
  ],
};

/**
 * Builds the service over a fake transaction manager. `linkExistente` decides
 * whether the doctor↔patient row is already there.
 */
function montar(opciones: { linkExistente: boolean; pacienteExiste?: boolean }) {
  const guardados: { entidad: unknown; valor: unknown }[] = [];

  const manager = {
    findOne: vi.fn(async (entidad: unknown) => {
      if (entidad === Paciente) {
        return opciones.pacienteExiste === false ? null : { id: '42' };
      }
      if (entidad === PacienteDoctor) {
        return opciones.linkExistente ? { pacienteId: '42', doctorId: '7' } : null;
      }
      // EstadoOrden
      return { id: '1', codigo: 'creada' };
    }),
    create: vi.fn((_entidad: unknown, valor: unknown) => valor),
    save: vi.fn(async (entidad: unknown, valor: unknown) => {
      guardados.push({ entidad, valor });
      return entidad === PacienteDoctor ? valor : { id: '99', ...(valor as object) };
    }),
  };

  const service = new PedidosService(
    {} as never,
    {} as never,
    {} as never,
    { findOne: vi.fn(async () => ({ id: '7', clinicaId: '1' })) } as never,
    {} as never,
    { transaction: (cb: (m: unknown) => unknown) => cb(manager) } as never,
    {} as never,
    { emitir: vi.fn() } as never,
  );

  return { service, guardados, manager };
}

describe('PedidosService.create · paciente de otra clínica', () => {
  it('vincula el paciente al doctor cuando todavía no lo atendió', async () => {
    const { service, guardados } = montar({ linkExistente: false });

    await service.create(dto as never, 'usuario-1');

    const vinculos = guardados.filter((g) => g.entidad === PacienteDoctor);
    expect(vinculos).toHaveLength(1);
    expect(vinculos[0]?.valor).toMatchObject({ pacienteId: '42', doctorId: '7' });
  });

  it('no duplica el vínculo si ya existe', async () => {
    const { service, guardados } = montar({ linkExistente: true });

    await service.create(dto as never, 'usuario-1');

    expect(guardados.filter((g) => g.entidad === PacienteDoctor)).toHaveLength(0);
  });

  it('rechaza un paciente inexistente con un 400 claro', async () => {
    const { service } = montar({ linkExistente: false, pacienteExiste: false });

    await expect(service.create(dto as never, 'usuario-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

/**
 * Builds the service over a fake transaction manager for the state machine.
 * `estadoActual` is the order's current state; `estadoDestino` is what
 * `cambiarEstado` resolves from the catalog by id.
 */
function montarEstados(opciones: {
  estadoActual: { codigo: string; nombre: string; esFinal: boolean };
  estadoDestino?: { codigo: string; nombre: string };
}) {
  const guardados: { entidad: unknown; valor: unknown }[] = [];
  const orden = {
    id: '5',
    doctorId: '7',
    estadoId: '2',
    estado: opciones.estadoActual,
    detalles: [],
  };

  const manager = {
    findOne: vi.fn(async (entidad: unknown) => {
      if (entidad === Orden) return orden;
      if (entidad === EstadoOrden) return { id: '10', ...opciones.estadoDestino };
      return null;
    }),
    create: vi.fn((_entidad: unknown, valor: unknown) => valor),
    save: vi.fn(async (entidad: unknown, valor: unknown) => {
      guardados.push({ entidad, valor });
      return valor;
    }),
  };

  const service = new PedidosService(
    {} as never,
    {} as never,
    {
      findOne: vi.fn(async () => ({
        id: '4',
        codigo: 'cancelada',
        nombre: 'Cancelada',
        esFinal: true,
      })),
    } as never,
    { findOne: vi.fn(async () => ({ id: '7', clinicaId: '1' })) } as never,
    {} as never,
    { transaction: (cb: (m: unknown) => unknown) => cb(manager) } as never,
    {} as never,
    { emitir: vi.fn() } as never,
  );

  return { service, guardados };
}

describe('PedidosService.cancelar · ventana de cancelación', () => {
  it('cancela una orden que ya fue recibida y guarda el motivo en el historial', async () => {
    const { service, guardados } = montarEstados({
      estadoActual: { codigo: 'recibida', nombre: 'Recibida', esFinal: false },
    });

    await service.cancelar('5', 'usuario-1', 'El paciente desistió');

    const historial = guardados.find((g) => g.entidad === HistorialEstadoOrden);
    expect(historial?.valor).toMatchObject({
      ordenId: '5',
      estadoNuevoId: '4',
      observaciones: 'El paciente desistió',
    });
    // La orden persistida debe quedar en cancelada, no solo el historial.
    const ordenGuardada = guardados.find((g) => g.entidad === Orden);
    expect(ordenGuardada?.valor).toMatchObject({
      estadoId: '4',
      estado: { codigo: 'cancelada' },
    });
  });

  it('rechaza cancelar una orden ya cancelada y no escribe historial', async () => {
    const { service, guardados } = montarEstados({
      estadoActual: { codigo: 'cancelada', nombre: 'Cancelada', esFinal: true },
    });

    await expect(service.cancelar('5', 'usuario-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(guardados).toHaveLength(0);
  });

  it('rechaza cancelar una orden terminada', async () => {
    const { service } = montarEstados({
      estadoActual: { codigo: 'terminada', nombre: 'Terminada', esFinal: true },
    });

    await expect(service.cancelar('5', 'usuario-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('PedidosService.cambiarEstado · estados definitivos', () => {
  it('no permite sacar una orden terminada de su estado', async () => {
    const { service, guardados } = montarEstados({
      estadoActual: { codigo: 'terminada', nombre: 'Terminada', esFinal: true },
      estadoDestino: { codigo: 'recibida', nombre: 'Recibida' },
    });

    await expect(service.cambiarEstado('5', '10', 'usuario-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(guardados).toHaveLength(0);
  });

  it('no permite volver de cancelada a recibida', async () => {
    const { service } = montarEstados({
      estadoActual: { codigo: 'cancelada', nombre: 'Cancelada', esFinal: true },
      estadoDestino: { codigo: 'recibida', nombre: 'Recibida' },
    });

    await expect(service.cambiarEstado('5', '10', 'usuario-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza anular por el cambio de estado genérico', async () => {
    const { service } = montarEstados({
      estadoActual: { codigo: 'en_proceso', nombre: 'En proceso', esFinal: false },
      estadoDestino: { codigo: 'cancelada', nombre: 'Cancelada' },
    });

    await expect(service.cambiarEstado('5', '10', 'usuario-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('sigue permitiendo una transición normal entre estados no finales', async () => {
    const { service, guardados } = montarEstados({
      estadoActual: { codigo: 'en_proceso', nombre: 'En proceso', esFinal: false },
      estadoDestino: { codigo: 'en_entrega', nombre: 'En entrega al cliente' },
    });

    await service.cambiarEstado('5', '10', 'usuario-1');

    const historial = guardados.find((g) => g.entidad === HistorialEstadoOrden);
    expect(historial?.valor).toMatchObject({ ordenId: '5', estadoNuevoId: '10' });
  });
});


describe('PedidosService.findAll · server pagination', () => {
  function buildListing(opts?: {
    total?: number;
    rows?: unknown[];
    pacienteIds?: string[] | null;
  }) {
    const total = opts?.total ?? 0;
    const rows = opts?.rows ?? [];
    const qb: any = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(total),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue(rows),
    };
    const service = new PedidosService(
      { createQueryBuilder: vi.fn().mockReturnValue(qb) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { buscarIds: vi.fn().mockResolvedValue(opts?.pacienteIds ?? null) } as never,
      { emitir: vi.fn() } as never,
    );
    return { service, qb };
  }

  it('returns the requested page, the correct total and a deterministic order with an id tiebreak', async () => {
    const rows = [{ id: '2' }, { id: '1' }];
    const { service, qb } = buildListing({ total: 12, rows });

    const res = await service.findAll({ page: '2', size: '5' });

    expect(qb.orderBy).toHaveBeenCalledWith({
      'o.fechaCreacion': 'DESC',
      'o.id': 'DESC',
    });
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(res).toEqual({ data: rows, total: 12, page: 2, size: 5 });
  });

  it('returns an empty page with the correct total when the page is beyond the end', async () => {
    const { service, qb } = buildListing({ total: 7 });

    const res = await service.findAll({ page: '9', size: '20' });

    expect(qb.getMany).not.toHaveBeenCalled();
    expect(res).toEqual({ data: [], total: 7, page: 9, size: 20 });
  });

  it('filters by state group in SQL before paginating and counts the filtered set', async () => {
    const { service, qb } = buildListing({ total: 3, rows: [{ id: '1' }] });

    const res = await service.findAll({ grupo: 'activas', page: '1', size: '10' });

    expect(qb.andWhere).toHaveBeenCalledWith('estado.codigo IN (:...codigos)', {
      codigos: [
        'creada',
        'recibida',
        'en_proceso',
        'en_entrega',
        'devuelta_correccion',
      ],
    });
    expect(qb.getCount).toHaveBeenCalled();
    expect(res.total).toBe(3);
  });

  it('filters urgent orders in SQL', async () => {
    const { service, qb } = buildListing({ total: 1, rows: [{ id: '1' }] });

    await service.findAll({ urgente: true });

    expect(qb.andWhere).toHaveBeenCalledWith('o.urgente = :urgente', {
      urgente: true,
    });
  });

  it('maps a whitelisted sort to its column and keeps the id tiebreak', async () => {
    const { service, qb } = buildListing({ total: 1, rows: [{ id: '1' }] });

    await service.findAll({ sort: 'entrega', order: 'asc' });

    expect(qb.orderBy).toHaveBeenCalledWith({
      'o.fechaEntrega': 'ASC',
      'o.id': 'ASC',
    });
  });

  it('clamps a size above the cap', async () => {
    const { service, qb } = buildListing({ total: 1, rows: [{ id: '1' }] });

    const res = await service.findAll({ page: '1', size: '500' });

    expect(res.size).toBe(100);
    expect(qb.take).toHaveBeenCalledWith(100);
  });
});
