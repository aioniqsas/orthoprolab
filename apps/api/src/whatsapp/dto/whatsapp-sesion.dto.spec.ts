import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { WhatsappSesionDto } from './whatsapp-sesion.dto.js';

async function errores(body: unknown): Promise<string[]> {
  const dto = plainToInstance(WhatsappSesionDto, body);
  const fallos = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return fallos.map((fallo) => fallo.property);
}

describe('WhatsappSesionDto', () => {
  it('accepts a phone as the bot receives it', async () => {
    await expect(errores({ telefono: '+57 300 123 4567' })).resolves.toHaveLength(0);
    await expect(errores({ telefono: '573001234567@s.whatsapp.net' })).resolves.toHaveLength(0);
  });

  it('rejects a missing, non-string or oversized phone', async () => {
    await expect(errores({})).resolves.toContain('telefono');
    await expect(errores({ telefono: 123 })).resolves.toContain('telefono');
    await expect(errores({ telefono: null })).resolves.toContain('telefono');
    await expect(errores({ telefono: ['+573001234567'] })).resolves.toContain('telefono');
    await expect(errores({ telefono: '9'.repeat(100_000) })).resolves.toContain('telefono');
    await expect(errores({ telefono: '123' })).resolves.toContain('telefono');
  });

  it('rejects unexpected properties', async () => {
    await expect(errores({ telefono: '+573001234567', clinicaId: 3 })).resolves.toContain('clinicaId');
  });
});
