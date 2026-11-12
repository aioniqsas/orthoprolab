import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { verificarFirma } from './whatsapp-firma.js';

const TOKEN = 'token-de-servicio';
const SECRETO = 'secreto-hmac';
const redisFalso = { set: vi.fn(async () => 'OK' as const) };

function firmar(telefono: unknown, opts?: { token?: string; timestamp?: string; nonce?: string; signature?: string }) {
  const timestamp = opts?.timestamp ?? String(Math.floor(Date.now() / 1000));
  const nonce = opts?.nonce ?? 'nonce-valido-123456';
  const telefonoFirma = typeof telefono === 'string' ? telefono : '';
  const signature = opts?.signature ?? createHmac('sha256', SECRETO)
    .update(`${telefonoFirma}|${timestamp}|${nonce}`)
    .digest('hex');
  return {
    telefono,
    token: opts?.token ?? TOKEN,
    timestamp,
    nonce,
    signature,
  };
}

describe('verificarFirma', () => {
  it('acepta una firma válida de teléfono string', async () => {
    await expect(
      verificarFirma(firmar('+573001234567'), TOKEN, SECRETO, redisFalso),
    ).resolves.toBeUndefined();
  });

  it.each([
    ['token ajeno', { token: 'otro' }],
    ['marca de tiempo fuera de ventana', { timestamp: String(Math.floor(Date.now() / 1000) - 1000) }],
    ['firma no hex', { signature: 'firma-no-hex' }],
    ['nonce corto', { nonce: 'corto' }],
  ])('rechaza %s con el mismo 401', async (_nombre, opts) => {
    await expect(verificarFirma(firmar('+573', opts), TOKEN, SECRETO, redisFalso)).rejects.toThrow(
      'Token de servicio inválido.',
    );
  });

  // Un teléfono no string se firmaba como '' y una firma sobre
  // `|timestamp|nonce` pasaba: `telefono: 123` o un objeto eran aceptados.
  it.each([
    ['número', 123],
    ['objeto', { telefono: '+573001234567' }],
    ['arreglo', ['+573001234567']],
    ['null', null],
  ])('rechaza un teléfono %s con el mismo 401', async (_nombre, telefono) => {
    await expect(
      verificarFirma(firmar(telefono), TOKEN, SECRETO, redisFalso),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      verificarFirma(firmar(telefono), TOKEN, SECRETO, redisFalso),
    ).rejects.toThrow('Token de servicio inválido.');
  });
});
