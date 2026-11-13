import { ForbiddenException } from '@nestjs/common';
import { Orden } from './orden.entity.js';
import { PedidosService } from './pedidos.service.js';
import { VENTANA_EN_PROCESO_MS, veredictoEdicion } from './ventana-edicion.js';

/** Creación y entrada a producción fijas: el reloj siempre se pasa, nunca se lee. */
const CREACION = new Date('2025-06-10T12:00:00.000Z');
const EN_PROCESO = new Date('2025-06-10T15:00:00.000Z');
const HORAS = 60 * 60 * 1000;

function veredicto(opciones: {
  estadoCodigo: string;
  ahora: Date;
  entradaEnProceso?: Date | null;
  fechaCreacion?: Date;
}) {
  return veredictoEdicion({
    estadoCodigo: opciones.estadoCodigo,
    entradaEnProceso: opciones.entradaEnProceso ?? null,
    fechaCreacion: opciones.fechaCreacion ?? CREACION,
    ahora: opciones.ahora,
  });
}

describe('veredictoEdicion · cada estado y su veredicto (S8)', () => {
  it.each(['creada', 'recibida', 'devuelta_correccion'])(
    '%s siempre se puede corregir, sin importar la fecha',
    (estadoCodigo) => {
      expect(
        veredicto({
          estadoCodigo,
          ahora: new Date(CREACION.getTime() + 365 * 24 * HORAS),
        }),
      ).toEqual({ editable: true, editableHasta: null, motivo: null });
    },
  );

  it.each([
    ['en_entrega', 'el trabajo ya está terminado'],
    ['terminada', 'el trabajo ya está terminado'],
    ['cancelada', 'la orden está cancelada'],
  ])('%s nunca se puede corregir', (estadoCodigo, motivo) => {
    expect(veredicto({ estadoCodigo, ahora: EN_PROCESO })).toEqual({
      editable: false,
      editableHasta: null,
      motivo,
    });
  });

  it('en_proceso a las 4 h 59 m de haber entrado todavía se puede corregir', () => {
    expect(
      veredicto({
        estadoCodigo: 'en_proceso',
        entradaEnProceso: EN_PROCESO,
        ahora: new Date(EN_PROCESO.getTime() + 4 * HORAS + 59 * 60 * 1000),
      }),
    ).toEqual({
      editable: true,
      editableHasta: new Date(EN_PROCESO.getTime() + VENTANA_EN_PROCESO_MS),
      motivo: null,
    });
  });

  it('en_proceso a las 5 h 01 m ya no se puede corregir y dice por qué', () => {
    expect(
      veredicto({
        estadoCodigo: 'en_proceso',
        entradaEnProceso: EN_PROCESO,
        ahora: new Date(EN_PROCESO.getTime() + 5 * HORAS + 60 * 1000),
      }),
    ).toEqual({
      editable: false,
      editableHasta: new Date(EN_PROCESO.getTime() + VENTANA_EN_PROCESO_MS),
      motivo: 'el trabajo ya entró a producción hace más de 5 horas',
    });
  });

  it('la ventana se cuenta desde la entrada a en_proceso, no desde la creación', () => {
    // Creada hace 20 horas, entró a proceso hace 1: todavía se corrige.
    const creadaHaceRato = new Date(EN_PROCESO.getTime() - 20 * HORAS);
    expect(
      veredicto({
        estadoCodigo: 'en_proceso',
        fechaCreacion: creadaHaceRato,
        entradaEnProceso: EN_PROCESO,
        ahora: new Date(EN_PROCESO.getTime() + 1 * HORAS),
      }).editable,
    ).toBe(true);
  });

  it('sin fila de historial cae a la creación', () => {
    const dentro = veredicto({
      estadoCodigo: 'en_proceso',
      entradaEnProceso: null,
      fechaCreacion: new Date(EN_PROCESO.getTime() - 4 * HORAS),
      ahora: EN_PROCESO,
    });
    expect(dentro).toEqual({
      editable: true,
      editableHasta: new Date(EN_PROCESO.getTime() + 1 * HORAS),
      motivo: null,
    });
    expect(
      veredicto({
        estadoCodigo: 'en_proceso',
        entradaEnProceso: null,
        fechaCreacion: new Date(EN_PROCESO.getTime() - 6 * HORAS),
        ahora: EN_PROCESO,
      }).editable,
    ).toBe(false);
  });
});

/**
 * Servicio de pedidos sobre un manager falso: la orden y las filas de historial
 * son las que deciden el veredicto de `update`.
 */
function montar(opciones: {
  estadoCodigo: string;
  fechaCreacion?: Date;
  entradas?: Array<{ ordenId: string; fechaCambio: Date }>;
}) {
  const orden = {
    id: '5',
    doctorId: '7',
    estadoId: '3',
    estado: { codigo: opciones.estadoCodigo, nombre: 'Estado' },
    fechaCreacion: opciones.fechaCreacion ?? CREACION,
    urgente: false,
  };
  const findHistorial = vi.fn(async () => opciones.entradas ?? []);
  const manager = {
    findOne: vi.fn(
      async (
        entidad: unknown,
        opcionesFind?: { relations?: Record<string, unknown> },
      ) =>
        entidad === Orden &&
        opcionesFind?.relations !== undefined &&
        'historial' in opcionesFind.relations
          ? { ...orden, detalles: [], historial: [] }
          : orden,
    ),
    getRepository: vi.fn(() => ({ find: findHistorial })),
    create: vi.fn((_entidad: unknown, valor: unknown) => valor),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
    softDelete: vi.fn(async () => undefined),
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

  return { service, manager, findHistorial };
}

describe('PedidosService.update · la ventana de edición la aplica la API', () => {
  it('en_proceso dentro de la ventana: busca la última entrada a producción con esa consulta exacta', async () => {
    const { service, manager, findHistorial } = montar({
      estadoCodigo: 'en_proceso',
      entradas: [{ ordenId: '5', fechaCambio: EN_PROCESO }],
    });

    await service.update('5', { urgente: true } as never, new Date(EN_PROCESO.getTime() + 4 * HORAS + 59 * 60 * 1000));

    // SQL: historial_estado_orden JOIN estado_orden WHERE estado_nuevo = 'en_proceso', más nuevo primero.
    expect(findHistorial).toHaveBeenCalledTimes(1);
    expect(findHistorial).toHaveBeenCalledWith({
      where: {
        ordenId: expect.objectContaining({ type: 'in', value: ['5'] }),
        estadoNuevo: { codigo: 'en_proceso' },
      },
      relations: { estadoNuevo: true },
      order: { fechaCambio: 'DESC' },
    });
    expect(manager.save).toHaveBeenCalled();
  });

  it('en_proceso a las 5 h 01 m: rechaza con la razón en palabras de la persona', async () => {
    const { service, manager } = montar({
      estadoCodigo: 'en_proceso',
      entradas: [{ ordenId: '5', fechaCambio: EN_PROCESO }],
    });

    await expect(
      service.update('5', { urgente: true } as never, new Date(EN_PROCESO.getTime() + 5 * HORAS + 60 * 1000)),
    ).rejects.toThrow(
      new ForbiddenException(
        'No se puede editar esta orden: el trabajo ya entró a producción hace más de 5 horas.',
      ),
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('una orden terminada se rechaza porque el trabajo ya está terminado', async () => {
    const { service } = montar({ estadoCodigo: 'terminada' });

    await expect(service.update('5', { urgente: true } as never, EN_PROCESO)).rejects.toThrow(
      new ForbiddenException('No se puede editar esta orden: el trabajo ya está terminado.'),
    );
  });

  it('recibida se edita sin consultar el historial (no depende del reloj)', async () => {
    const { service, findHistorial, manager } = montar({ estadoCodigo: 'recibida' });

    await service.update('5', { urgente: true } as never, EN_PROCESO);

    expect(findHistorial).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalled();
  });

  it('devuelta_correccion se edita: el laboratorio la devolvió para corregir', async () => {
    const { service, manager } = montar({ estadoCodigo: 'devuelta_correccion' });

    await service.update('5', { urgente: true } as never, EN_PROCESO);

    expect(manager.save).toHaveBeenCalled();
  });
});

describe('PedidosService.anotarEditable · el veredicto viaja en la orden', () => {
  it('anota editable/editableHasta en la orden y consulta el historial solo de las que están en proceso', async () => {
    const entradas = [{ ordenId: '5', fechaCambio: EN_PROCESO }];
    const findHistorial = vi.fn(async () => entradas);
    const service = new PedidosService(
      { manager: { getRepository: () => ({ find: findHistorial }) } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { emitir: vi.fn() } as never,
    );
    const enProceso = {
      id: '5',
      estado: { codigo: 'en_proceso' },
      fechaCreacion: CREACION,
    } as Orden;
    const terminada = {
      id: '6',
      estado: { codigo: 'terminada' },
      fechaCreacion: CREACION,
    } as Orden;

    const [primera, segunda] = await service.anotarEditable(
      [enProceso, terminada],
      new Date(EN_PROCESO.getTime() + 4 * HORAS),
    );

    expect(findHistorial).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ordenId: expect.objectContaining({ value: ['5'] }),
        }),
      }),
    );
    expect(primera).toMatchObject({
      editable: true,
      editableHasta: new Date(EN_PROCESO.getTime() + VENTANA_EN_PROCESO_MS).toISOString(),
    });
    expect(segunda).toMatchObject({ editable: false, editableHasta: null });
  });

  it('no consulta el historial cuando ninguna orden está en proceso', async () => {
    const findHistorial = vi.fn(async () => []);
    const service = new PedidosService(
      { manager: { getRepository: () => ({ find: findHistorial }) } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { emitir: vi.fn() } as never,
    );

    await service.anotarEditable([
      { id: '7', estado: { codigo: 'creada' }, fechaCreacion: CREACION } as Orden,
    ]);

    expect(findHistorial).not.toHaveBeenCalled();
  });
});

describe('PedidosService.entradasEnProceso · la última entrada manda', () => {
  it('de varias filas se queda con la más nueva de cada orden', async () => {
    const nueva = new Date('2025-06-11T10:00:00.000Z');
    const service = new PedidosService(
      {
        manager: {
          getRepository: () => ({
            find: vi.fn(async () => [
              { ordenId: '5', fechaCambio: nueva },
              { ordenId: '5', fechaCambio: EN_PROCESO },
              { ordenId: '6', fechaCambio: EN_PROCESO },
            ]),
          }),
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { emitir: vi.fn() } as never,
    );

    const entradas = await service.entradasEnProceso(['5', '6']);

    expect(entradas.get('5')).toBe(nueva);
    expect(entradas.get('6')).toBe(EN_PROCESO);
  });

  it('sin órdenes no toca la base', async () => {
    const find = vi.fn();
    const service = new PedidosService(
      { manager: { getRepository: () => ({ find }) } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { emitir: vi.fn() } as never,
    );

    await expect(service.entradasEnProceso([])).resolves.toEqual(new Map());
    expect(find).not.toHaveBeenCalled();
  });
});
