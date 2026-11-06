import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../../security/validation.js';
import { CreateOrdenDto } from './create-orden.dto.js';

const pipe = createValidationPipe();
const validate = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: CreateOrdenDto }) as Promise<CreateOrdenDto>;

const base = {
  doctorId: '7',
  pacienteId: 12,
  detalles: [{ servicio: 'Corona de zirconia', cantidad: 1, dientes: [11], colorDiente: 'A2' }],
};

const detalle = (dientes: unknown) => ({
  ...base,
  detalles: [{ servicio: 'Corona de zirconia', cantidad: 1, dientes, colorDiente: 'A2' }],
});

describe('CreateOrdenDto', () => {
  it('accepts a line with selected teeth and one shade', async () => {
    const dto = await validate(base);
    expect(dto.detalles[0]?.dientes).toEqual([11]);
    expect(dto.detalles[0]?.colorDiente).toBe('A2');
    expect(dto.detalles[0]?.servicio).toBe('Corona de zirconia');
  });

  it('trims the shade of the line', async () => {
    const dto = await validate({
      ...base,
      detalles: [
        { servicio: '  Corona  ', cantidad: 1, dientes: [11, 21], colorDiente: '  A2  ' },
      ],
    });
    expect(dto.detalles[0]?.colorDiente).toBe('A2');
    expect(dto.detalles[0]?.servicio).toBe('Corona');
  });

  it('rejects a line without teeth', async () => {
    await expect(validate(detalle([]))).rejects.toBeInstanceOf(BadRequestException);
    await expect(validate(detalle(undefined))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects teeth outside the FDI permanent range', async () => {
    for (const numero of [0, 19, 29, 30, 39, 40, 49, 55, 11.5]) {
      await expect(validate(detalle([numero]))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
  });

  it('rejects a blank or oversized work name', async () => {
    const conNombre = (servicio: string) => ({
      ...base,
      detalles: [{ servicio, cantidad: 1, dientes: [11], colorDiente: 'A2' }],
    });
    await expect(validate(conNombre('   '))).rejects.toBeInstanceOf(BadRequestException);
    await expect(validate(conNombre('A'.repeat(121)))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a blank or oversized shade', async () => {
    const conColor = (colorDiente: string) => ({
      ...base,
      detalles: [{ servicio: 'Corona', cantidad: 1, dientes: [11], colorDiente }],
    });
    await expect(validate(conColor('   '))).rejects.toBeInstanceOf(BadRequestException);
    await expect(validate(conColor('A'.repeat(21)))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
