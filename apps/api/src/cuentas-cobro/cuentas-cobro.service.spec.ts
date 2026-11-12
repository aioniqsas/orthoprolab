import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { CuentasCobroService } from './cuentas-cobro.service.js';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { Orden } from '../pedidos/orden.entity.js';
import { CuentaCobroOrden } from './cuenta-cobro-orden.entity.js';

/**
 * Servicio sobre una transacción falsa. `estadoCodigo` es el estado de la orden
 * que se intenta adjuntar.
 */
function montar(estadoCodigo: string, vinculoEliminado = false) {
  const guardadas: unknown[] = [];

  const cadenaConsulta = {
    innerJoin: () => cadenaConsulta,
    where: () => cadenaConsulta,
    andWhere: () => cadenaConsulta,
    getOne: async () => null,
  };

  const em = {
    findOne: vi.fn(async (entidad: unknown) => {
      if (entidad === CuentaCobroOrden && vinculoEliminado) {
        return { cuentaCobroId: '3', ordenId: '9', eliminadoEn: new Date() };
      }
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
    restore: vi.fn(async () => undefined),
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
    { emitir: vi.fn() } as never,
  );

  return { service, guardadas, em };
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

  it('restaura el vínculo eliminado y actualiza el snapshot al volver a adjuntar', async () => {
    const { service, em } = montar('terminada', true);

    await service.adjuntarOrdenes('3', { ordenes: [{ ordenId: 9, valor: 125 }] } as never);

    expect(em.restore).toHaveBeenCalledWith(CuentaCobroOrden, {
      cuentaCobroId: '3',
      ordenId: '9',
    });
    expect(em.update).toHaveBeenCalledWith(
      CuentaCobroOrden,
      { cuentaCobroId: '3', ordenId: '9' },
      { valorSnapshot: '125.00' },
    );
  });

  it('acepta una orden terminada', async () => {
    const { service, guardadas } = montar('terminada');

    await service.adjuntarOrdenes('3', { ordenes: [{ ordenId: 9, valor: 100 }] } as never);

    expect(guardadas).toEqual(
      expect.arrayContaining([expect.objectContaining({ ordenId: '9', valorSnapshot: '100.00' })]),
    );
  });
});

/**
 * La consulta de órdenes disponibles es el otro contrato que vale anclar: una
 * orden ya adjunta a una cuenta activa no vuelve a ofrecerse, e incluye la
 * cuenta abierta.
 */
function montarDisponibles() {
  const subConsultas: unknown[][] = [];

  const subBuilder = {
    select: vi.fn(() => subBuilder),
    innerJoin: vi.fn(() => subBuilder),
    where: vi.fn((...args: unknown[]) => {
      subConsultas.push(args);
      return subBuilder;
    }),
    andWhere: vi.fn((...args: unknown[]) => {
      subConsultas.push(args);
      return subBuilder;
    }),
    getQuery: () => 'SELECT cco.orden_id FROM cuenta_cobro_orden cco',
    getParameters: () => ({ anulada: 'anulada' }),
  };

  const parametros: Record<string, unknown>[] = [];
  const outerBuilder = {
    leftJoinAndSelect: vi.fn(() => outerBuilder),
    where: vi.fn(() => outerBuilder),
    andWhere: vi.fn(() => outerBuilder),
    setParameters: vi.fn((params: Record<string, unknown>) => {
      parametros.push(params);
      return outerBuilder;
    }),
    orderBy: vi.fn(() => outerBuilder),
    getMany: vi.fn(async () => [{ id: '9' }]),
  };

  const service = new CuentasCobroService(
    { findOne: vi.fn(async () => ({ id: '3', clinicaId: '2' })) } as never,
    { createQueryBuilder: () => subBuilder } as never,
    {} as never,
    { createQueryBuilder: () => outerBuilder } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { emitir: vi.fn() } as never,
  );

  return { service, subConsultas, parametros };
}

describe('CuentasCobroService.findOrdenesDisponibles', () => {
  it('excluye lo adjunto a cualquier cuenta activa, incluida la actual', async () => {
    const { service, subConsultas } = montarDisponibles();

    await expect(service.findOrdenesDisponibles('3')).resolves.toEqual([{ id: '9' }]);

    const condiciones = subConsultas.map((args) => String(args[0])).join(' ');
    expect(condiciones).toContain('anulada');
    // Regresión: filtrar por `cuentaCobroId != :cuentaCobroId` volvía a ofrecer
    // las órdenes ya adjuntas a la cuenta abierta.
    expect(condiciones).not.toContain('cuentaCobroId');
  });

  it('ofrece solo órdenes terminadas y conserva el filtro por clínica', async () => {
    const { service, parametros } = montarDisponibles();

    await service.findOrdenesDisponibles('3');

    expect(parametros.at(-1)).toEqual({
      anulada: 'anulada',
      terminada: 'terminada',
      clinicaId: '2',
    });
  });
});

describe('CuentasCobroService.obtenerPdfBytes', () => {
  const fetchMock = vi.fn();
  beforeAll(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    fetchMock.mockClear();
  });

  const montarPdf = (cuenta: unknown) => {
    const service = new CuentasCobroService(
      { findOne: vi.fn(async () => cuenta) } as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, { emitir: vi.fn() } as never,
    );
    const generarYGuardarPdf = vi.spyOn(service, 'generarYGuardarPdf');
    return { service, generarYGuardarPdf };
  };

  it('sirve el PDF ya almacenado sin regenerarlo', async () => {
    const { service, generarYGuardarPdf } = montarPdf({
      id: '3',
      numero: 'CC-2025-9',
      pdfUrl: 'https://res.cloudinary.com/cuenta.pdf',
    });
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7').buffer,
    });

    const pdf = await service.obtenerPdfBytes('3');

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(generarYGuardarPdf).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('https://res.cloudinary.com/cuenta.pdf');
  });

  it('genera solo cuando no hay PDF almacenado y devuelve sus bytes', async () => {
    const { service, generarYGuardarPdf } = montarPdf({ id: '3', pdfUrl: null });
    generarYGuardarPdf.mockResolvedValue({
      id: '3',
      numero: 'CC-2025-1',
      clinicaId: '2',
      estado: 'emitida',
      fechaEmision: new Date(),
      pdfUrl: 'https://res.cloudinary.com/nueva.pdf',
    } as never);
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7 generada').buffer,
    });

    const pdf = await service.obtenerPdfBytes('3');

    expect(generarYGuardarPdf).toHaveBeenCalledTimes(1);
    expect(pdf.toString()).toBe('%PDF-1.7 generada');
  });

  it('falla con 503 y sin cuerpo parcial si la generación falla', async () => {
    const { service, generarYGuardarPdf } = montarPdf({ id: '3', pdfUrl: null });
    generarYGuardarPdf.mockRejectedValue(new Error('boom'));

    await expect(service.obtenerPdfBytes('3')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falla con 503 si la descarga del PDF almacenado no responde', async () => {
    const { service } = montarPdf({
      id: '3',
      pdfUrl: 'https://res.cloudinary.com/rota.pdf',
    });
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(service.obtenerPdfBytes('3')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  /**
   * Ronda adversarial T11: el fetch de `pdfUrl` no tenía esquema ni host
   * permitido; solo la propia subida de la app (Cloudinary, secure) es válida.
   */
  it('rechaza sin fetch un pdfUrl que no es https', async () => {
    const { service } = montarPdf({
      id: '3',
      pdfUrl: 'http://res.cloudinary.com/cuenta.pdf',
    });

    await expect(service.obtenerPdfBytes('3')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza sin fetch un pdfUrl de un host ajeno a Cloudinary', async () => {
    const { service } = montarPdf({
      id: '3',
      pdfUrl: 'https://evil.example.com/cuenta.pdf',
    });

    await expect(service.obtenerPdfBytes('3')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dos peticiones concurrentes sin PDF generan una sola vez y reciben los mismos bytes', async () => {
    const cuenta: {
      id: string;
      estado: string;
      pdfUrl: string | null;
      numero: string;
    } = { id: '3', estado: 'emitida', pdfUrl: null, numero: 'CC-2025-1' };
    let liberar: (valor: Buffer) => void;
    const generate = vi.fn(
      () =>
        new Promise<Buffer>((resolve) => {
          liberar = resolve;
        }),
    );
    const upload = vi.fn(async () => ({
      url: 'https://res.cloudinary.com/demo/raw/upload/orthopro/cuentas/CC_2025_1.pdf',
      hash: 'h',
    }));
    const findOne = vi.fn(async () => ({ ...cuenta }));
    const update = vi.fn(async (_w: unknown, vals: Record<string, unknown>) => {
      Object.assign(cuenta, vals);
    });
    const service = new CuentasCobroService(
      { findOne, update } as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never,
      { generate, uploadToCloudinary: upload } as never,
      {} as never, {} as never, {} as never,
      { emitir: vi.fn() } as never,
    );
    fetchMock.mockImplementation(async () => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7 unica').buffer,
    }));

    const primera = service.obtenerPdfBytes('3');
    const segunda = service.obtenerPdfBytes('3');
    // generate corre tras awaits internos: espera a que arranque la generación
    // (nunca resuelve sola, el diferido la controla) antes de liberarla.
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    liberar!(Buffer.from('%PDF-1.7 unica'));
    const [a, b] = await Promise.all([primera, segunda]);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(a.equals(b)).toBe(true);
  });

  it('rechaza con 503 un PDF que supera el tamaño maximo', async () => {
    const { service } = montarPdf({
      id: '3',
      pdfUrl: 'https://res.cloudinary.com/enorme.pdf',
    });
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(5 * 1024 * 1024 + 1),
    });

    await expect(service.obtenerPdfBytes('3')).rejects.toThrow(/tama/);
  });

  it('persiste pdfUrl solo tras la subida y responde 503 si la descarga posterior falla', async () => {
    const cuenta: {
      id: string;
      estado: string;
      pdfUrl: string | null;
      numero: string;
    } = { id: '3', estado: 'emitida', pdfUrl: null, numero: 'CC-2025-1' };
    const update = vi.fn(async (_w: unknown, vals: Record<string, unknown>) => {
      Object.assign(cuenta, vals);
    });
    const findOne = vi.fn(async () => ({ ...cuenta }));
    const service = new CuentasCobroService(
      { findOne, update } as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never,
      {
        generate: vi.fn(async () => Buffer.from('%PDF')),
        uploadToCloudinary: vi.fn(async () => ({
          url: 'https://res.cloudinary.com/demo/raw/upload/orthopro/cuentas/CC_2025_1.pdf',
          hash: 'h',
        })),
      } as never,
      {} as never, {} as never, {} as never,
      { emitir: vi.fn() } as never,
    );
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.obtenerPdfBytes('3')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]![1]).toMatchObject({
      pdfUrl: 'https://res.cloudinary.com/demo/raw/upload/orthopro/cuentas/CC_2025_1.pdf',
    });
  });
});
