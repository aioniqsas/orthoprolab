/**
 * S5: the list query is validated at the HTTP boundary (unknown `sort` or
 * `order` is a 400, never ignored) and the sort key is mapped to a real column
 * with the id tiebreak that keeps two pages from repeating or skipping rows.
 */
import { describe, expect, it } from 'vitest';
import { createValidationPipe } from '../security/validation.js';
import { orderByWhitelist } from './list-query.js';
import { ListOrdenesQueryDto } from '../pedidos/dto/list-ordenes-query.dto.js';
import { ListCuentasQueryDto } from '../cuentas-cobro/dto/list-cuentas-query.dto.js';
import { ListUsuariosQueryDto } from '../usuarios/dto/list-usuarios-query.dto.js';
import { ListServiciosQueryDto } from '../catalogo/dto/list-servicios-query.dto.js';
import { ListClinicasQueryDto } from '../clinicas/dto/list-clinicas-query.dto.js';
import { ListPacientesQueryDto } from '../mi-clinica/dto/list-pacientes-query.dto.js';

const pipe = createValidationPipe();
const run = (cls: new () => object, query: unknown) =>
  pipe.transform(query, { type: 'query', metatype: cls });

describe('list query DTOs', () => {
  it('accepts the whitelisted sort keys and asc/desc', async () => {
    const dto = (await run(ListOrdenesQueryDto, {
      sort: 'entrega',
      order: 'asc',
      grupo: 'activas',
      urgente: 'true',
      page: '2',
      size: '25',
    })) as ListOrdenesQueryDto;
    expect(dto).toMatchObject({
      sort: 'entrega',
      order: 'asc',
      grupo: 'activas',
      urgente: true,
      page: 2,
      size: 25,
    });
  });

  it.each([
    [ListOrdenesQueryDto, { sort: 'password' }],
    [ListOrdenesQueryDto, { order: 'sideways' }],
    [ListOrdenesQueryDto, { grupo: 'todas' }],
    [ListOrdenesQueryDto, { urgente: 'si' }],
    [ListOrdenesQueryDto, { size: '0' }],
    [ListCuentasQueryDto, { sort: 'password' }],
    [ListCuentasQueryDto, { order: 'up' }],
    [ListCuentasQueryDto, { grupo: 'inventado' }],
    [ListUsuariosQueryDto, { sort: 'password' }],
    [ListUsuariosQueryDto, { activo: 'si' }],
    [ListServiciosQueryDto, { sort: 'descripcion' }],
    [ListClinicasQueryDto, { sort: 'password' }],
    [ListPacientesQueryDto, { sort: 'nombre' }],
  ])('rejects an invalid list query (%o)', async (cls, query) => {
    await expect(run(cls, query)).rejects.toThrow(/400|Bad Request/);
  });

  it('accepts the active flag as a boolean pair', async () => {
    const inactivos = (await run(ListServiciosQueryDto, {
      activo: 'false',
    })) as ListServiciosQueryDto;
    expect(inactivos.activo).toBe(false);
  });

  it('clamps nothing at the DTO: a size above the cap still passes validation', async () => {
    const dto = (await run(ListOrdenesQueryDto, { size: '500' })) as ListOrdenesQueryDto;
    expect(dto.size).toBe(500);
  });

  it.each([
    [ListOrdenesQueryDto, 'orden'],
    [ListOrdenesQueryDto, 'creada'],
    [ListOrdenesQueryDto, 'entrega'],
    [ListOrdenesQueryDto, 'total'],
    [ListOrdenesQueryDto, 'doctor'],
    [ListCuentasQueryDto, 'numero'],
    [ListUsuariosQueryDto, 'nombre'],
    [ListServiciosQueryDto, 'precio'],
    [ListClinicasQueryDto, 'nombre'],
  ])('accepts the whitelisted sort %s of %s', async (cls, sort) => {
    await expect(run(cls, { sort })).resolves.toBeDefined();
  });
});

describe('orderByWhitelist', () => {
  const whitelist = {
    creada: 'o.fechaCreacion',
    entrega: 'o.fechaEntrega',
  };

  it('maps the sort key to its column and keeps the id tiebreak', () => {
    expect(
      orderByWhitelist(whitelist, 'o.id', { sort: 'entrega', order: 'asc' }, 'creada', 'DESC'),
    ).toEqual({ 'o.fechaEntrega': 'ASC', 'o.id': 'ASC' });
  });

  it('uses the endpoint default when no sort arrives', () => {
    expect(orderByWhitelist(whitelist, 'o.id', {}, 'creada', 'DESC')).toEqual({
      'o.fechaCreacion': 'DESC',
      'o.id': 'DESC',
    });
  });

  it.each(['constructor', '__proto__', 'toString'])(
    'falls back to the default for the inherited key %s, never a column',
    (sort) => {
      const clinicas = { nombre: 'c.nombre', creado: 'c.fechaCreacion' };

      const order = orderByWhitelist(
        clinicas,
        'c.id',
        { sort },
        'nombre',
        'ASC',
      );

      expect(order).toEqual({ 'c.nombre': 'ASC', 'c.id': 'ASC' });
      for (const column of Object.keys(order)) {
        expect(typeof column).toBe('string');
        expect(column).not.toContain('native code');
        expect(column).not.toContain('[object Object]');
      }
    },
  );

  it('never interpolates the requested value into SQL', () => {
    const order = orderByWhitelist(
      whitelist,
      'o.id',
      { sort: "id; DROP TABLE orden", order: 'asc' },
      'creada',
      'DESC',
    );
    expect(order).toEqual({ 'o.fechaCreacion': 'ASC', 'o.id': 'ASC' });
  });
});
