import { BadRequestException } from '@nestjs/common';
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
