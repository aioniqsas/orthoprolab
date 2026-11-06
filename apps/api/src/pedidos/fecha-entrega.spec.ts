import { BadRequestException } from '@nestjs/common';
import { diaBogota, hoyBogota, parseFechaEntrega } from './fecha-entrega.js';

describe('parseFechaEntrega', () => {
  it('acepta una entrega el mismo día de creación después de mediodía', () => {
    // El caso que fallaba: `fecha_entrega` a las 12:00 UTC contra una creación
    // de la tarde en Bogotá.
    const fecha = parseFechaEntrega('2026-11-06', '2026-11-06');
    expect(fecha?.toISOString()).toBe('2026-11-06T12:00:00.000Z');
  });

  it('acepta fechas futuras', () => {
    expect(parseFechaEntrega('2026-11-07', '2026-11-06')?.toISOString()).toBe(
      '2026-11-07T12:00:00.000Z',
    );
  });

  it('rechaza una fecha anterior a la de creación con el mensaje de la regla', () => {
    expect(() => parseFechaEntrega('2026-11-05', '2026-11-06')).toThrow(
      BadRequestException,
    );
    expect(() => parseFechaEntrega('2026-11-05', '2026-11-06')).toThrow(
      'La fecha de entrega no puede ser anterior a la fecha de creación de la orden.',
    );
  });

  it('trata vacío y nulo como sin fecha', () => {
    expect(parseFechaEntrega(null, '2026-11-06')).toBeNull();
    expect(parseFechaEntrega(undefined, '2026-11-06')).toBeNull();
    expect(parseFechaEntrega('', '2026-11-06')).toBeNull();
  });

  it('sigue aceptando un ISO completo y descarta lo ilegible', () => {
    expect(parseFechaEntrega('2026-11-10T15:30:00.000Z')?.toISOString()).toBe(
      '2026-11-10T15:30:00.000Z',
    );
    expect(parseFechaEntrega('no-es-fecha')).toBeNull();
  });
});

describe('diaBogota', () => {
  it('usa el día de Bogotá, no el de UTC', () => {
    // 02:00 UTC del 7 de noviembre son las 21:00 del 6 en Bogotá.
    expect(diaBogota(new Date('2026-11-07T02:00:00.000Z'))).toBe('2026-11-06');
  });

  it('hoyBogota devuelve un día ISO', () => {
    expect(hoyBogota()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
