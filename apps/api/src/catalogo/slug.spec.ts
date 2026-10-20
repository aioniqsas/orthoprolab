import { slugify, uniqueSlug } from './slug.js';

describe('slugify', () => {
  it.each([
    ['Ortodoncia Fija', 'ortodoncia-fija'],
    ['Retenedores y Férulas', 'retenedores-y-ferulas'],
    ['  Alineadores   Invisibles  ', 'alineadores-invisibles'],
    ['Año Ñandú & Cía.', 'ano-nandu-cia'],
    ['--Hola__Mundo--', 'hola-mundo'],
    ['A/B 100%', 'a-b-100'],
  ])('turns %j into %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('falls back to "servicio" when nothing alphanumeric remains', () => {
    expect(slugify('***')).toBe('servicio');
    expect(slugify('')).toBe('servicio');
  });

  it('caps the length at 120 without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(118)} bbbb`);
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('uniqueSlug', () => {
  it('returns the base when it is free', async () => {
    expect(await uniqueSlug('ortodoncia', () => false)).toBe('ortodoncia');
  });

  it('adds the first free numeric suffix on collision', async () => {
    const taken = new Set(['ortodoncia', 'ortodoncia-2', 'ortodoncia-3']);
    expect(await uniqueSlug('ortodoncia', (s) => taken.has(s))).toBe(
      'ortodoncia-4',
    );
  });

  it('supports async existence checks', async () => {
    const taken = new Set(['x']);
    expect(await uniqueSlug('x', (s) => Promise.resolve(taken.has(s)))).toBe(
      'x-2',
    );
  });

  it('keeps the suffixed slug within 120 characters', async () => {
    const base = 'a'.repeat(120);
    const result = await uniqueSlug(base, (s) => s === base);
    expect(result.length).toBeLessThanOrEqual(120);
    expect(result.endsWith('-2')).toBe(true);
  });
});
