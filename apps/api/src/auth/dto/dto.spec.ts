import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../../security/validation.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';

const pipe = createValidationPipe();
const validate = <T>(metatype: new () => T, value: unknown) =>
  pipe.transform(value, { type: 'body', metatype }) as Promise<T>;

const valid = {
  nombres: 'María José',
  apellidos: "O'Brien-Pérez",
  cedula: '1234567',
  correo: 'doc@example.com',
  password: 'a'.repeat(12),
};

describe('RegisterDto', () => {
  it('accepts a valid payload', async () => {
    const dto = await validate(RegisterDto, valid);
    expect(dto.correo).toBe('doc@example.com');
  });

  it('trims and lower-cases the email', async () => {
    const dto = await validate(RegisterDto, {
      ...valid,
      correo: '  Doc@Example.COM ',
    });
    expect(dto.correo).toBe('doc@example.com');
  });

  it.each([
    [11, false],
    [12, true],
    [200, true],
    [201, false],
  ])('password of %i characters ok=%s', async (len, ok) => {
    const p = validate(RegisterDto, { ...valid, password: 'a'.repeat(len) });
    if (ok) await expect(p).resolves.toBeDefined();
    else await expect(p).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['1234', '1234567890123', '12a45678', '12.345.678', ''])(
    'rejects cedula %j',
    async (cedula) => {
      await expect(
        validate(RegisterDto, { ...valid, cedula }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('accepts cedulas of 5 and 12 digits', async () => {
    await expect(
      validate(RegisterDto, { ...valid, cedula: '12345' }),
    ).resolves.toBeDefined();
    await expect(
      validate(RegisterDto, { ...valid, cedula: '123456789012' }),
    ).resolves.toBeDefined();
  });

  it.each(['not-an-email', 'a@b', `${'a'.repeat(250)}@x.co`, ''])(
    'rejects email %j',
    async (correo) => {
      await expect(
        validate(RegisterDto, { ...valid, correo }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(['', 'Ana123', 'Ana<script>', 'x'.repeat(101)])(
    'rejects nombres %j',
    async (nombres) => {
      await expect(
        validate(RegisterDto, { ...valid, nombres }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects unknown fields such as rol', async () => {
    await expect(
      validate(RegisterDto, { ...valid, rol: 'administrador' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-string values', async () => {
    await expect(
      validate(RegisterDto, { ...valid, password: 123456789012 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('LoginDto', () => {
  it('normalizes the email and accepts any 1-200 char password', async () => {
    const dto = await validate(LoginDto, {
      correo: ' A@B.co ',
      password: 'x',
    });
    expect(dto.correo).toBe('a@b.co');
    await expect(
      validate(LoginDto, { correo: 'a@b.co', password: 'x'.repeat(200) }),
    ).resolves.toBeDefined();
  });

  it.each(['', 'x'.repeat(201)])('rejects password length %#', async (p) => {
    await expect(
      validate(LoginDto, { correo: 'a@b.co', password: p }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown fields', async () => {
    await expect(
      validate(LoginDto, { correo: 'a@b.co', password: 'x', rol: 'a' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
