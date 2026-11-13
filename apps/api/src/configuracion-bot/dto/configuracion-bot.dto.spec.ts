import { describe, expect, it } from 'vitest';
import { createValidationPipe } from '../../security/validation.js';
import { PatchConfiguracionBotDto } from './configuracion-bot.dto.js';

const pipe = createValidationPipe();
const run = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: PatchConfiguracionBotDto }) as Promise<
    PatchConfiguracionBotDto
  >;

describe('PatchConfiguracionBotDto', () => {
  it('acepta un nombre y lo recorta', async () => {
    expect((await run({ nombre: '  Aioniq  ' })).nombre).toBe('Aioniq');
  });

  it.each([
    ['una cadena vacía', ''],
    ['solo espacios', '   '],
    ['41 caracteres', 'a'.repeat(41)],
  ])('rechaza %s', async (_label, nombre) => {
    await expect(run({ nombre })).rejects.toMatchObject({ status: 400 });
  });

  it('acepta el límite de 40 caracteres', async () => {
    await run({ nombre: 'a'.repeat(40) });
  });

  it.each([
    ['un salto de línea', 'Aioniq\nLab'],
    ['un tabulador', 'Aioniq\tLab'],
    ['un carriage return', 'Aioniq\rLab'],
    ['un carácter nulo', 'Aioniq\u0000'],
  ])('rechaza %s', async (_label, nombre) => {
    await expect(run({ nombre })).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ['un número', 5],
    ['ausente', undefined],
    ['un objeto', { nombre: {} }],
  ])('rechaza %s como nombre', async (_label, nombre) => {
    await expect(run({ nombre })).rejects.toMatchObject({ status: 400 });
  });

  it('rechaza campos desconocidos', async () => {
    await expect(run({ nombre: 'Aioniq', extra: 1 })).rejects.toMatchObject({ status: 400 });
  });
});
