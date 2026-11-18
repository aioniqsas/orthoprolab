import { coincideBusqueda, normalizarBusqueda } from './busqueda.js';

describe('coincideBusqueda', () => {
  it('matches case- and accent-insensitively', () => {
    expect(coincideBusqueda('perez', ['Juan Pérez'])).toBe(true);
    expect(coincideBusqueda('JUAN', ['juan'])).toBe(true);
  });

  it('matches part of a cedula, so the last digits work', () => {
    expect(coincideBusqueda('2664', ['1001812664'])).toBe(true);
    expect(coincideBusqueda('9999', ['1001812664'])).toBe(false);
  });

  it('returns everything for an empty query and ignores null fields', () => {
    expect(coincideBusqueda('', [null])).toBe(true);
    expect(coincideBusqueda('  ', [])).toBe(true);
    expect(coincideBusqueda('x', [null, undefined])).toBe(false);
  });

  it('normalizes accents', () => {
    expect(normalizarBusqueda('Ñandú')).toBe('nandu');
  });
});
