import type { Response } from 'express';
import { NotFoundException, StreamableFile } from '@nestjs/common';
import { MiClinicaController } from './mi-clinica.controller.js';

const setHeader = vi.fn();
const res = { setHeader } as unknown as Response;

const montar = (cuentaPdf: () => Promise<unknown>) =>
  new MiClinicaController(
    { cuentaPdf } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

const req = { user: { id: 'u' } } as never;

describe('MiClinicaController.descargarCuentaCobroPdf', () => {
  it('entrega el PDF con Cache-Control private, no-store', async () => {
    const pdf = Buffer.from('%PDF-1.7');
    const controller = montar(async () => ({ pdf, numero: 'CC-2025-9' }));

    const salida = await controller.descargarCuentaCobroPdf(req, '3', res);

    expect(salida).toBeInstanceOf(StreamableFile);
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('tambien manda Cache-Control cuando la cuenta no existe (404)', async () => {
    setHeader.mockClear();
    const controller = montar(async () => {
      throw new NotFoundException('Cuenta de cobro no encontrada.');
    });

    await expect(
      controller.descargarCuentaCobroPdf(req, '3', res),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });
});

describe('MiClinicaController.crearCodigoVinculacion', () => {
  const montarVinculacion = (clinicaId: string) => {
    const emitirCodigo = vi.fn().mockResolvedValue({ codigo: '123456', expiraEnSegundos: 600 });
    const resolveClinicaId = vi.fn().mockResolvedValue(clinicaId);
    const controller = new MiClinicaController(
      { resolveClinicaId } as never,
      {} as never,
      {} as never,
      {} as never,
      { emitirCodigo } as never,
    );
    return { controller, emitirCodigo, resolveClinicaId };
  };

  it('usa la clínica de la sesión; el endpoint no acepta cuerpo que la force', async () => {
    const { controller, emitirCodigo, resolveClinicaId } = montarVinculacion('42');
    // La firma del método no recibe cuerpo: la clínica solo puede venir de la sesión.
    const salida = await controller.crearCodigoVinculacion({ user: { id: 'u1' } } as never);
    expect(resolveClinicaId).toHaveBeenCalledWith('u1');
    expect(emitirCodigo).toHaveBeenCalledWith('42');
    expect(salida).toEqual({ codigo: '123456', expiraEnSegundos: 600 });
  });

  it('sin clínica activa propaga el error del resolver', async () => {
    const { controller } = montarVinculacion('42');
    (controller as never as { miClinica: { resolveClinicaId: () => Promise<never> } }).miClinica.resolveClinicaId =
      () => Promise.reject(new NotFoundException('Sin clínica asignada'));
    await expect(controller.crearCodigoVinculacion({ user: { id: 'u1' } } as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
