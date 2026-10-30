import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../../security/validation.js';
import { CreateOrdenDto } from './create-orden.dto.js';

const pipe = createValidationPipe();
const validate = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: CreateOrdenDto }) as Promise<CreateOrdenDto>;

const base = {
  doctorId: '7',
  pacienteId: 12,
  detalles: [{ servicioId: 3, cantidad: 1, dientes: [{ numero: 11, color: 'A2' }] }],
};

const detalle = (dientes: unknown) => ({
  ...base,
  detalles: [{ servicioId: 3, cantidad: 1, dientes }],
});

describe('CreateOrdenDto', () => {
  it('accepts a line with selected teeth', async () => {
    const dto = await validate(base);
    expect(dto.detalles[0]?.dientes).toEqual([{ numero: 11, color: 'A2' }]);
  });

  it('trims the tooth colour', async () => {
    const dto = await validate(detalle([{ numero: 11, color: '  A2  ' }]));
    expect(dto.detalles[0]?.dientes[0]?.color).toBe('A2');
  });

  it('rejects a line without teeth', async () => {
    await expect(validate(detalle([]))).rejects.toBeInstanceOf(BadRequestException);
    await expect(validate(detalle(undefined))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects teeth outside the FDI permanent range', async () => {
    for (const numero of [0, 19, 29, 30, 39, 40, 49, 55, 11.5]) {
      await expect(
        validate(detalle([{ numero, color: 'A2' }])),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('rejects a blank or oversized tooth colour', async () => {
    await expect(
      validate(detalle([{ numero: 11, color: '   ' }])),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validate(detalle([{ numero: 11, color: 'A'.repeat(21) }])),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
