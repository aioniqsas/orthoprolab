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
