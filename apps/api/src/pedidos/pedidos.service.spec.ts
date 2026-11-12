import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { Paciente } from '../pacientes/paciente.entity.js';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';
import { DetalleOrden } from './detalle-orden.entity.js';

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
function montar(opciones: {
  linkExistente: boolean;
  linkEliminado?: boolean;
  pacienteExiste?: boolean;
}) {
  const guardados: { entidad: unknown; valor: unknown }[] = [];

  const manager = {
    findOne: vi.fn(async (entidad: unknown) => {
      if (entidad === Paciente) {
        return opciones.pacienteExiste === false ? null : { id: '42' };
      }
      if (entidad === PacienteDoctor) {
        return opciones.linkExistente
          ? {
              pacienteId: '42',
              doctorId: '7',
              ...(opciones.linkEliminado ? { eliminadoEn: new Date() } : {}),
            }
          : null;
      }
      // EstadoOrden
      return { id: '1', codigo: 'creada' };
    }),
    create: vi.fn((_entidad: unknown, valor: unknown) => valor),
    save: vi.fn(async (entidad: unknown, valor: unknown) => {
      guardados.push({ entidad, valor });
      return entidad === PacienteDoctor ? valor : { id: '99', ...(valor as object) };
    }),
    restore: vi.fn(async () => undefined),
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

  it('restaura un vínculo paciente-doctor eliminado en vez de insertarlo', async () => {
    const { service, manager, guardados } = montar({ linkExistente: true, linkEliminado: true });

    await service.create(dto as never, 'usuario-1');

    expect(manager.restore).toHaveBeenCalledWith(PacienteDoctor, {
      doctorId: '7',
      pacienteId: '42',
    });
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

describe('PedidosService.update · detalle de orden', () => {
  it('hace soft-delete de las líneas anteriores y devuelve solo las vivas', async () => {
    const detalleVivo = { id: '2', ordenId: '5', servicio: 'Nueva línea' };
    let findOneCalls = 0;
    const manager = {
      findOne: vi.fn(async (entidad: unknown) => {
        findOneCalls += 1;
        return findOneCalls === 1 && entidad === Orden
          ? { id: '5', estado: { codigo: 'creada' }, fechaCreacion: new Date() }
          : { id: '5', detalles: [detalleVivo] };
      }),
      softDelete: vi.fn(async () => undefined),
      create: vi.fn((_entidad: unknown, valor: unknown) => valor),
      save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
    };
    const service = new PedidosService(
      {} as never, {} as never, {} as never,
      { findOne: vi.fn(async () => null) } as never,
      {} as never,
      { transaction: (cb: (m: unknown) => unknown) => cb(manager) } as never,
      {} as never, { emitir: vi.fn() } as never,
    );

    const result = await service.update('5', { detalles: [] } as never);

    expect(manager.softDelete).toHaveBeenCalledWith(DetalleOrden, { ordenId: '5' });
    expect(manager).not.toHaveProperty('delete');
    expect(result.detalles).toEqual([detalleVivo]);
  });
});

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
