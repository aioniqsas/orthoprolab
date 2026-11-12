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
    );
    return { service, pacientesService };
  }

  it('con doctorId de la clínica, lo valida y lo envía al servicio de pacientes', async () => {
    const { service, pacientesService } = montarPaciente({ id: 'd1', clinicaId: '2' });

    await service.createPaciente('u', '1020304050', 'Nombre', 'd1');

    expect(pacientesService.findOrCreateForClinica).toHaveBeenCalledWith(
      '1020304050',
      'Nombre',
      'd1',
    );
  });

  it('rechaza con 404 un doctorId de otra clínica', async () => {
    const { service, pacientesService } = montarPaciente(null);

    await expect(
      service.createPaciente('u', '1020304050', 'Nombre', 'otro'),
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
