import { BadRequestException } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { createValidationPipe } from './validation.js';

class SampleDto {
  @Type(() => String)
  @IsString()
  @MaxLength(5)
  name!: string;
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const meta = { type: 'body' as const, metatype: SampleDto };

  async function failure(value: unknown): Promise<BadRequestException> {
    try {
      await pipe.transform(value, meta);
    } catch (e) {
      return e as BadRequestException;
    }
    throw new Error('expected validation to fail');
  }

  it('returns a consistent 400 body with message[] and error', async () => {
    const e = await failure({ name: 'way-too-long-value' });
    expect(e.getStatus()).toBe(400);
    expect(e.getResponse()).toEqual({
      statusCode: 400,
      message: expect.any(Array),
      error: 'Bad Request',
    });
  });

  it('does not echo rejected values', async () => {
    const e = await failure({ name: 'way-too-long-value', extra: 'SECRET-X' });
    expect(JSON.stringify(e.getResponse())).not.toContain('way-too-long-value');
    expect(JSON.stringify(e.getResponse())).not.toContain('SECRET-X');
  });

  it('rejects unknown properties', async () => {
    const e = await failure({ name: 'ok', admin: true });
    const body = e.getResponse() as { message: string[] };
    expect(body.message.join(' ')).toMatch(/admin/);
  });

  it('accepts valid input', async () => {
    await expect(pipe.transform({ name: 'ok' }, meta)).resolves.toEqual({
      name: 'ok',
    });
  });
});
