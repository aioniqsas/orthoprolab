import { digitosDe, nombreBuscable, palabrasNormalizadas, trigramas } from './busqueda-tokens.js';

describe('busqueda-tokens', () => {
  it('normalizes words without case, accents or punctuation', () => {
    expect(palabrasNormalizadas('Juan-Pérez, Ñu')).toEqual(['juan', 'perez', 'nu']);
  });

  it('builds the trigrams of each word, without duplicates', () => {
    expect(trigramas('Aristi aristi')).toEqual(['ari', 'ris', 'ist', 'sti']);
  });

  it('ignores words shorter than three letters for trigrams', () => {
    expect(trigramas('Li Wu')).toEqual([]);
  });

  it('keeps digits of a cedula', () => {
    expect(digitosDe('1.001-812 664')).toBe('1001812664');
  });

  it('requires three letters to search a name', () => {
    expect(nombreBuscable('Al')).toBe(false);
    expect(nombreBuscable('Ana')).toBe(true);
  });
});
