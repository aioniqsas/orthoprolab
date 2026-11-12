import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MiClinicaService } from './mi-clinica.service.js';

/** Servicio con `getOrden` simulado: el estado decide si hay control descargable. */
function montar(estadoCodigo: string) {
  const generar = vi.fn(async () => Buffer.from('%PDF-1.7'));

  const service = new MiClinicaService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { generate: generar } as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const getOrden = vi.spyOn(service, 'getOrden').mockResolvedValue({
    id: '9',
    estado: { codigo: estadoCodigo, nombre: 'Estado' },
  } as never);

  return { service, generar, getOrden };
}

describe('MiClinicaService.resolveClinicaId', () => {
  const resolver = (clinica: { activo: boolean } | null) =>
    new MiClinicaService(
      { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      { findOneBy: vi.fn(async () => clinica) } as never,
      {} as never, {} as never, {} as never, {} as never,
      {} as never,
    );

  it('devuelve el id cuando la clínica está activa', async () => {
    await expect(resolver({ activo: true }).resolveClinicaId('u')).resolves.toBe('2');
  });

  it.each([
    ['inactiva', { activo: false }],
    ['inexistente', null],
  ])('rechaza una clínica %s con 403', async (_nombre, clinica) => {
    await expect(resolver(clinica).resolveClinicaId('u')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('MiClinicaService.listOrdenes', () => {
  function montarListado(ordenes: unknown[]) {
    const qb: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const metodo of [
      'innerJoinAndSelect',
      'leftJoinAndSelect',
      'where',
      'orderBy',
    ]) {
      qb[metodo] = vi.fn(() => qb);
    }
    qb['getMany'] = vi.fn(async () => ordenes);
    const service = new MiClinicaService(
      { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
      {} as never,
      { createQueryBuilder: vi.fn(() => qb) } as never,
      {} as never, {} as never, {} as never,
      { findOneBy: vi.fn(async () => ({ activo: true })) } as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
    );
    return { service, qb };
  }

  it('la consulta une los detalles y el doctor, con el filtro de clinica', async () => {
    const { service, qb } = montarListado([]);

    await service.listOrdenes('u');

    // Sin este join el bot no recibe `detalles` y la precarga (S12) muere.
    expect(qb['leftJoinAndSelect']).toHaveBeenCalledWith(
      'o.detalles',
      'detalle',
    );
    expect(qb['innerJoinAndSelect']).toHaveBeenCalledWith('asig.doctor', 'doctor');
    expect(qb['where']).toHaveBeenCalledWith(
      'doctor.clinicaId = :clinicaId',
      { clinicaId: '2' },
    );
  });

  it('devuelve ordenes con `detalles` presentes', async () => {
    const detalles = [{ servicio: 'Corona', cantidad: 2, colorDiente: 'A2' }];
    const { service } = montarListado([
      { id: '9', asignacion: { doctor: { id: 'd1' } }, estado: { codigo: 'creada' }, detalles },
    ]);

    const ordenes = await service.listOrdenes('u');

    expect(ordenes).toHaveLength(1);
    expect(ordenes[0]!.detalles).toEqual(detalles);
  });
});

describe('MiClinicaService.controlTrabajos', () => {
  it('entrega el PDF de una orden terminada', async () => {
    const { service, generar } = montar('terminada');

    const pdf = await service.controlTrabajos('usuario-1', '9');

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(generar).toHaveBeenCalledTimes(1);
  });

  it('rechaza una orden que aún no está terminada', async () => {
    const { service, generar } = montar('en_entrega');

    await expect(service.controlTrabajos('usuario-1', '9')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(generar).not.toHaveBeenCalled();
  });

  it('rechaza una orden cancelada', async () => {
    const { service } = montar('cancelada');

    await expect(service.controlTrabajos('usuario-1', '9')).rejects.toThrow(
      /El control de trabajos está disponible cuando la orden está terminada/,
    );
  });

  it('resuelve la orden con el usuario, para respetar la clínica', async () => {
    const { service, getOrden } = montar('terminada');

    await service.controlTrabajos('usuario-7', '9');

    // getOrden aplica la verificación de pertenencia a la clínica del usuario.
    expect(getOrden).toHaveBeenCalledWith('usuario-7', '9');
  });
});

describe('MiClinicaService.createPaciente', () => {
  function montarPaciente(doctor: unknown) {
    const pacientesService = {
      findOrCreateForClinica: vi.fn(async () => ({ id: '5', nombre: 'P' })),
    };
    const service = new MiClinicaService(
      { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
      { findOneBy: vi.fn(async () => doctor) } as never,
      {} as never, {} as never, {} as never, {} as never,
      { findOneBy: vi.fn(async () => ({ activo: true })) } as never,
      {} as never, {} as never, {} as never,
      pacientesService as never,
      {} as never,
    );
    return { service, pacientesService };
  }

  it('con doctorId de la clínica, lo valida y lo envía al servicio de pacientes', async () => {
    const { service, pacientesService } = montarPaciente({ id: '9', clinicaId: '2' });

    await service.createPaciente('u', '1020304050', 'Nombre', '9');

    expect(pacientesService.findOrCreateForClinica).toHaveBeenCalledWith(
      '1020304050',
      'Nombre',
      '9',
    );
  });

  it('rechaza con 404 un doctorId de otra clínica', async () => {
    const { service, pacientesService } = montarPaciente(null);

    await expect(
      service.createPaciente('u', '1020304050', 'Nombre', '10'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(pacientesService.findOrCreateForClinica).not.toHaveBeenCalled();
  });

  it('sin doctorId mantiene la compatibilidad y no adivina doctor', async () => {
    const { service, pacientesService } = montarPaciente({ id: 'd1' });

    await service.createPaciente('u', '1020304050', 'Nombre');

    expect(pacientesService.findOrCreateForClinica).toHaveBeenCalledWith(
      '1020304050',
      'Nombre',
      null,
    );
  });
});

describe('MiClinicaService.cuentaPdf', () => {
  function montarCuenta(cuenta: unknown, clinica: { activo: boolean } | null = { activo: true }) {
    const cuentasCobro = {
      obtenerPdfBytes: vi.fn(async () => Buffer.from('%PDF-1.7 cuenta')),
    };
    const findOne = vi.fn(async () => cuenta);
    const clinicaFindOneBy = vi.fn(async () => clinica);
    const service = new MiClinicaService(
      { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
      {} as never, {} as never,
      { findOne } as never,
      {} as never, {} as never,
      { findOneBy: clinicaFindOneBy } as never,
      {} as never, {} as never, {} as never, {} as never,
      cuentasCobro as never,
    );
    return { service, cuentasCobro, findOne, clinicaFindOneBy };
  }

  it('entrega los bytes y el numero de una cuenta propia', async () => {
    const { service, cuentasCobro } = montarCuenta({
      id: '3',
      clinicaId: '2',
      estado: 'emitida',
      numero: 'CC-2025-9',
      pagos: [],
    });

    const { pdf, numero } = await service.cuentaPdf('u', '3');

    expect(pdf.toString()).toBe('%PDF-1.7 cuenta');
    expect(numero).toBe('CC-2025-9');
    expect(cuentasCobro.obtenerPdfBytes).toHaveBeenCalledWith('3');
  });

  it('rechaza con 404 una cuenta de otra clinica, sin revelar que existe', async () => {
    const { service, cuentasCobro, findOne } = montarCuenta(null);

    await expect(service.cuentaPdf('u', '3')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // La consulta debe llevar el filtro del llamador: si se quitara `clinicaId`,
    // este caso seguiria pasando con findOne devolviendo la cuenta de otra clinica.
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '3', clinicaId: '2' } }),
    );
    expect(cuentasCobro.obtenerPdfBytes).not.toHaveBeenCalled();
  });

  it('rechaza con 403 si la clinica del llamador quedo inactiva entre peticiones', async () => {
    const { service, cuentasCobro, clinicaFindOneBy } = montarCuenta(
      { id: '3', clinicaId: '2', estado: 'emitida', numero: 'CC-2025-9', pagos: [] },
      { activo: false },
    );

    await expect(service.cuentaPdf('u', '3')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(clinicaFindOneBy).toHaveBeenCalledWith({ id: '2' });
    expect(cuentasCobro.obtenerPdfBytes).not.toHaveBeenCalled();
  });

  it('rechaza con 404 un borrador, igual que getCuentaCobro', async () => {
    const { service, cuentasCobro } = montarCuenta({
      id: '3',
      clinicaId: '2',
      estado: 'borrador',
      numero: 'CC-2025-1',
      pagos: [],
    });

    await expect(service.cuentaPdf('u', '3')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cuentasCobro.obtenerPdfBytes).not.toHaveBeenCalled();
  });
});

describe('MiClinicaService: ids no numéricos (SQL inyectado o byte nulo)', () => {
  // Antes el id llegaba a PostgreSQL como cast de bigint fallido: 500 con
  // mensaje genérico. Ahora se responde 400 antes de tocar la base.
  const reposFalsos = () => ({
    findOneBy: vi.fn(async () => {
      throw new Error('no debe tocar la base');
    }),
    createQueryBuilder: vi.fn(() => {
      throw new Error('no debe tocar la base');
    }),
  });

  function montarId() {
    return new MiClinicaService(
      reposFalsos() as never, reposFalsos() as never, reposFalsos() as never,
      reposFalsos() as never, reposFalsos() as never, reposFalsos() as never,
      reposFalsos() as never, {} as never, {} as never, {} as never,
      {} as never, {} as never,
    );
  }

  it.each([
    ['getOrden', '1 OR 1=1'],
    ['getOrden', '1; DROP TABLE orden'],
    ['getCuentaCobro', '1 UNION SELECT nombre FROM usuario'],
    ['getDoctor', '1\x00'],
  ])('%s rechaza el id no numérico con 400', async (metodo, id) => {
    const service = montarId();
    await expect(
      (service as never as Record<string, (u: string, i: string) => Promise<unknown>>)[metodo]('u', id),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('los ids numéricos siguen llegando a la base (feliz camino intacto)', async () => {
    const ordenes = { createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getOne: vi.fn(async () => null),
    }) };
    const service = new MiClinicaService(
      { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
      reposFalsos() as never, ordenes as never,
      reposFalsos() as never, reposFalsos() as never, reposFalsos() as never,
      { findOneBy: vi.fn(async () => ({ activo: true })) } as never,
      {} as never, {} as never, {} as never,
      {} as never, {} as never,
    );
    await expect(service.getOrden('u', '9')).rejects.toBeInstanceOf(NotFoundException);
    expect(ordenes.createQueryBuilder).toHaveBeenCalled();
  });
});
