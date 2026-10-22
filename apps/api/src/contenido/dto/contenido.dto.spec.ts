import { createValidationPipe } from '../../security/validation.js';
import { MAX_PARRAFO } from '../contenido.schema.js';
import { PutContenidoDto } from './contenido.dto.js';

const pipe = createValidationPipe();
const run = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: PutContenidoDto }) as Promise<
    PutContenidoDto
  >;

describe('PutContenidoDto', () => {
  it('accepts a map of keys to values and trims both', async () => {
    const dto = await run({
      valores: { ' home.hero.titulo ': '  Nuevo  ' },
    });
    expect(dto.valores).toEqual({ 'home.hero.titulo': 'Nuevo' });
  });

  it('accepts an empty value (means "delete this row") and an empty map', async () => {
    expect((await run({ valores: { 'home.hero.titulo': '' } })).valores).toEqual(
      { 'home.hero.titulo': '' },
    );
    expect((await run({ valores: {} })).valores).toEqual({});
  });

  it.each([
    ['a non-object', 'texto'],
    ['an array', [{ clave: 'home.hero.titulo' }]],
    ['a missing valores', undefined],
  ])('rejects %s', async (_label, valores) => {
    await expect(run({ valores })).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ['a numeric value', { 'home.hero.titulo': 5 }],
    ['a nested object', { 'home.hero.titulo': { texto: 'x' } }],
    ['an upper-case clave', { 'Home.Hero.Titulo': 'x' }],
    ['a clave with a single segment', { titulo: 'x' }],
    ['a clave with spaces', { 'home hero titulo': 'x' }],
    ['a clave with an empty segment', { 'home..titulo': 'x' }],
  ])('rejects %s', async (_label, valores) => {
    await expect(run({ valores })).rejects.toMatchObject({ status: 400 });
  });

  it('rejects values longer than the paragraph limit', async () => {
    await expect(
      run({ valores: { 'home.hero.subtitulo': 'a'.repeat(MAX_PARRAFO + 1) } }),
    ).rejects.toMatchObject({ status: 400 });
    await run({ valores: { 'home.hero.subtitulo': 'a'.repeat(MAX_PARRAFO) } });
  });

  it('rejects unknown top-level fields', async () => {
    await expect(
      run({ valores: {}, extra: true }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
