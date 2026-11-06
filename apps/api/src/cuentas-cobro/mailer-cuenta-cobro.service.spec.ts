import { MailerCuentaCobroService } from './mailer-cuenta-cobro.service.js';
import type { CuentaCobro } from './cuenta-cobro.entity.js';

const config = {
  get: (clave: string) =>
    ({ SMTP_HOST: 'smtp.test', SMTP_USER: 'user', SMTP_PASS: 'pass', SMTP_FROM: 'lab@test' })[clave],
};

const cuenta = {
  id: '1',
  numero: 'CC-2026-0001',
  total: '250000.00',
  fechaEmision: null,
  fechaVencimiento: null,
  clinica: { nombre: 'Clinica Muelas Flojas' },
} as unknown as CuentaCobro;

describe('MailerCuentaCobroService.sendCuentaCobro · adjuntos', () => {
  it('adjunta la cuenta y el control de trabajos de cada orden incluida', async () => {
    const enviados: { attachments: { filename: string }[] }[] = [];
    const mailQueue = {
      enqueue: vi.fn(async (mail: { attachments: { filename: string }[] }) => {
        enviados.push(mail);
        return { sent: true };
      }),
    };

    const service = new MailerCuentaCobroService(config as never, mailQueue as never);

    await service.sendCuentaCobro(cuenta, Buffer.from('cuenta'), 'clinica@test', [
      { filename: 'control-de-trabajos-orden-9.pdf', buffer: Buffer.from('control-9') },
      { filename: 'control-de-trabajos-orden-12.pdf', buffer: Buffer.from('control-12') },
    ]);

    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.attachments.map((a) => a.filename)).toEqual([
      'cuenta_CC_2026_0001.pdf',
      'control-de-trabajos-orden-9.pdf',
      'control-de-trabajos-orden-12.pdf',
    ]);
  });

  it('envía solo la cuenta cuando no hay órdenes incluidas', async () => {
    const enviados: { attachments: { filename: string }[] }[] = [];
    const mailQueue = {
      enqueue: vi.fn(async (mail: { attachments: { filename: string }[] }) => {
        enviados.push(mail);
        return { sent: true };
      }),
    };

    const service = new MailerCuentaCobroService(config as never, mailQueue as never);
    await service.sendCuentaCobro(cuenta, Buffer.from('cuenta'), 'clinica@test');

    expect(enviados[0]!.attachments.map((a) => a.filename)).toEqual(['cuenta_CC_2026_0001.pdf']);
  });
});
