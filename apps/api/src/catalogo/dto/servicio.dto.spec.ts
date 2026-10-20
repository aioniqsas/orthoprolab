import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createValidationPipe } from '../../security/validation.js';
import { CreateServicioDto, UpdateServicioDto } from './servicio.dto.js';

const pipe = createValidationPipe();
const run = (cls: new () => object, body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: cls });

const valid = { nombre: 'Ortodoncia', descripcion: 'Texto', precio: '10.5' };

describe('CreateServicioDto', () => {
  it('accepts a valid body and normalizes nombre and precio', async () => {
    const dto = (await run(CreateServicioDto, {
      ...valid,
      nombre: '  Ortodoncia  ',
    })) as CreateServicioDto;
    expect(dto.nombre).toBe('Ortodoncia');
    expect(dto.precio).toBe('10.50');
  });

  it.each([
    ['0', '0.00'],
    ['12', '12.00'],
    ['12.3', '12.30'],
    ['12.34', '12.34'],
    ['9999999999', '9999999999.00'],
    ['9999999999.99', '9999999999.99'],
  ])('accepts precio %s as %s', async (input, expected) => {
    const dto = (await run(CreateServicioDto, {
      ...valid,
      precio: input,
    })) as CreateServicioDto;
    expect(dto.precio).toBe(expected);
  });

  it.each([
    '-1',
    '1.234',
    '12345678901',
    '1,5',
    ' 5',
    '1e3',
    '',
    '.5',
    '5.',
    'abc',
  ])('rejects precio %j', async (precio) => {
    await expect(
      run(CreateServicioDto, { ...valid, precio }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a numeric precio (must be a string)', async () => {
    await expect(
      run(CreateServicioDto, { ...valid, precio: 10 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ['too short', 'a'],
    ['blank after trim', '   '],
    ['too long', 'a'.repeat(121)],
    ['not a string', 5],
  ])('rejects nombre: %s', async (_l, nombre) => {
    await expect(
      run(CreateServicioDto, { ...valid, nombre }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('accepts nombre of 2 and 120 characters', async () => {
    await run(CreateServicioDto, { ...valid, nombre: 'ab' });
    await run(CreateServicioDto, { ...valid, nombre: 'a'.repeat(120) });
  });

  it('accepts descripcion up to 2000, null, or omitted; rejects longer', async () => {
    await run(CreateServicioDto, { ...valid, descripcion: 'a'.repeat(2000) });
    await run(CreateServicioDto, { ...valid, descripcion: null });
    await run(CreateServicioDto, { nombre: 'Nombre', precio: '1' });
    await expect(
      run(CreateServicioDto, { ...valid, descripcion: 'a'.repeat(2001) }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('accepts activo boolean and rejects other types', async () => {
    await run(CreateServicioDto, { ...valid, activo: false });
    await expect(
      run(CreateServicioDto, { ...valid, activo: 'yes' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each(['slug', 'id', 'imagenUrl', 'imagenPublicId', 'extra'])(
    'rejects unknown field %s',
    async (field) => {
      await expect(
        run(CreateServicioDto, { ...valid, [field]: 'x' }),
      ).rejects.toMatchObject({ status: 400 });
    },
  );

  it('requires nombre and precio', async () => {
    await expect(run(CreateServicioDto, {})).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('UpdateServicioDto', () => {
  it('accepts a partial body and normalizes precio', async () => {
    const dto = (await run(UpdateServicioDto, {
      precio: '5',
    })) as UpdateServicioDto;
    expect(dto.precio).toBe('5.00');
    expect(dto.nombre).toBeUndefined();
  });

  it('accepts an empty body (no-op patch)', async () => {
    await run(UpdateServicioDto, {});
  });

  it('still validates provided fields', async () => {
    await expect(
      run(UpdateServicioDto, { precio: '1.999' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(run(UpdateServicioDto, { nombre: 'x' })).rejects.toMatchObject(
      { status: 400 },
    );
  });

  it('is a class-validator target', async () => {
    const dto = plainToInstance(UpdateServicioDto, { nombre: 'x' });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
