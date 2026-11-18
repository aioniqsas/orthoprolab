/**
 * S1: every paginated list endpoint keeps the same contract — requested page,
 * correct total, an empty page beyond the end and a size clamped to the cap —
 * and orders deterministically with an explicit id tiebreak.
 */
import { describe, expect, it, vi } from 'vitest';
import { ServiciosService } from '../catalogo/servicios.service.js';
import { ClinicasService } from '../clinicas/clinicas.service.js';
import { CuentasCobroService } from '../cuentas-cobro/cuentas-cobro.service.js';
import { MiClinicaService } from '../mi-clinica/mi-clinica.service.js';
import { PacientesService } from '../pacientes/pacientes.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { MAX_SIZE } from './pagination.js';

type Row = { id: string; [field: string]: unknown };

/** Minimal TypeORM query builder double: chained calls return itself. */
function fakeQueryBuilder(opts: { total?: number; rows?: Row[] } = {}) {
  const total = opts.total ?? 0;
  const rows = opts.rows ?? [];
  const qb: Record<string, unknown> = {};
  for (const method of [
    'leftJoinAndSelect',
    'innerJoinAndSelect',
    'innerJoin',
    'leftJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
  ]) {
    qb[method] = vi.fn(() => qb);
  }
  qb.orderBy = vi.fn(() => qb);
  qb.addOrderBy = vi.fn(() => qb);
  qb.skip = vi.fn(() => qb);
  qb.take = vi.fn(() => qb);
  qb.offset = vi.fn(() => qb);
  qb.limit = vi.fn(() => qb);
  qb.getCount = vi.fn(async () => total);
  qb.getMany = vi.fn(async () => rows);
  qb.getManyAndCount = vi.fn(async () => [rows, total]);
  qb.getRawMany = vi.fn(async () => rows);
  qb.getRawOne = vi.fn(async () => ({ count: String(total) }));
  return qb as typeof qb & {
    orderBy: ReturnType<typeof vi.fn>;
    addOrderBy: ReturnType<typeof vi.fn>;
    andWhere: ReturnType<typeof vi.fn>;
    skip: ReturnType<typeof vi.fn>;
    take: ReturnType<typeof vi.fn>;
    getCount: ReturnType<typeof vi.fn>;
    getMany: ReturnType<typeof vi.fn>;
  };
}

const servicioRow = (id: string) => ({
  id,
  slug: `servicio-${id}`,
  nombre: `Servicio ${id}`,
  descripcion: null,
  imagenUrl: null,
});

function servicios(opts: { total?: number; rows?: Row[] } = {}) {
  const qb = fakeQueryBuilder(opts);
  const repo = {
    createQueryBuilder: vi.fn(() => qb),
    findAndCount: vi.fn(async () => [opts.rows ?? [], opts.total ?? 0]),
  };
  const service = new ServiciosService(
    repo as never,
    {} as never,
    null,
    { emitir: vi.fn() } as never,
  );
  return { service, repo, qb };
}

function clinicas(opts: { total?: number; rows?: Row[] } = {}) {
  const qb = fakeQueryBuilder(opts);
  const doctorsQb = fakeQueryBuilder();
  const service = new ClinicasService(
    {} as never,
    { createQueryBuilder: vi.fn(() => qb) } as never,
    { createQueryBuilder: vi.fn(() => doctorsQb) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, qb };
}

function cuentas(opts: { total?: number; rows?: Row[] } = {}) {
  const qb = fakeQueryBuilder(opts);
  const service = new CuentasCobroService(
    { createQueryBuilder: vi.fn(() => qb) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { emitir: vi.fn() } as never,
  );
  return { service, qb };
}

function usuarios(opts: { total?: number; rows?: Row[] } = {}) {
  const qb = fakeQueryBuilder(opts);
  const service = new UsuariosService(
    {} as never,
    { createQueryBuilder: vi.fn(() => qb) } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, qb };
}

function miClinica(opts: {
  total?: number;
  rows?: Row[];
  servicioRepo?: unknown;
} = {}) {
  const qb = fakeQueryBuilder(opts);
  const repo = { createQueryBuilder: vi.fn(() => qb) } as never;
  const service = new MiClinicaService(
    { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
    {} as never,
    repo,
    repo,
    repo,
    (opts.servicioRepo ?? repo) as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { buscarIds: vi.fn(async () => null) } as never,
  );
  return { service, qb };
}

describe('GET /admin/catalogo/servicios', () => {
  it('clamps the size, keeps the total and ties the order by id', async () => {
    const { service, qb } = servicios({ total: 3, rows: [{ id: '1' }] });

    const res = await service.listAdmin(undefined, '1', '500');

    expect(res).toMatchObject({ total: 3, page: 1, size: MAX_SIZE });
    expect(qb.take).toHaveBeenCalledWith(MAX_SIZE);
    expect(qb.orderBy).toHaveBeenCalledWith({ 's.nombre': 'ASC', 's.id': 'ASC' });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const { service, qb } = servicios({ total: 3 });

    const res = await service.listAdmin(undefined, '9', '20');

    expect(qb.getMany).not.toHaveBeenCalled();
    expect(res).toEqual({ data: [], total: 3, page: 9, size: 20 });
  });
});

describe('GET /catalogo/servicios', () => {
  it('returns the requested page with the total and an id tiebreak', async () => {
    const rows = [servicioRow('1'), servicioRow('2')];
    const { service, repo } = servicios({ total: 5, rows: rows as never });

    const res = await service.listPublic('2', '2');

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 2,
        take: 2,
        order: { nombre: 'ASC', id: 'ASC' },
      }),
    );
    expect(res).toEqual({
      data: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        nombre: row.nombre,
        descripcion: row.descripcion,
        imagenUrl: row.imagenUrl,
      })),
      total: 5,
      page: 2,
      size: 2,
    });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const { service } = servicios({ total: 5 });

    const res = await service.listPublic('9', '20');

    expect(res).toEqual({ data: [], total: 5, page: 9, size: 20 });
  });
});

describe('GET /clinicas', () => {
  it('clamps the size, keeps the total and ties the order by id', async () => {
    const { service, qb } = clinicas({ total: 4, rows: [{ id: '1' }] });

    const res = await service.findAll(undefined, '1', '500');

    expect(res).toMatchObject({ total: 4, page: 1, size: MAX_SIZE });
    expect(qb.orderBy).toHaveBeenCalledWith({ 'c.nombre': 'ASC', 'c.id': 'ASC' });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const { service } = clinicas({ total: 4 });

    const res = await service.findAll(undefined, '9', '20');

    expect(res).toEqual({ data: [], total: 4, page: 9, size: 20 });
  });
});

describe('GET /cuentas-cobro', () => {
  it('clamps the size, keeps the total and ties the order by id', async () => {
    const { service, qb } = cuentas({ total: 2, rows: [{ id: '1' }] });

    const res = await service.findAll(undefined, undefined, '1', '500');

    expect(res).toMatchObject({ total: 2, page: 1, size: MAX_SIZE });
    expect(qb.orderBy).toHaveBeenCalledWith({
      'cc.createdAt': 'DESC',
      'cc.id': 'DESC',
    });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const { service } = cuentas({ total: 2 });

    const res = await service.findAll(undefined, undefined, '7', '20');

    expect(res).toEqual({ data: [], total: 2, page: 7, size: 20 });
  });
});

describe('GET /usuarios', () => {
  it('clamps the size and ties the order by id', async () => {
    const { service, qb } = usuarios({ total: 6, rows: [{ id: '1' }] });

    const res = await service.findAll(undefined, '2', '500');

    expect(res).toMatchObject({ total: 6, page: 2, size: MAX_SIZE });
    expect(qb.orderBy).toHaveBeenCalledWith({ 'u.apellidos': 'ASC', 'u.id': 'ASC' });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const { service } = usuarios({ total: 6 });

    const res = await service.findAll(undefined, '4', '20');

    expect(res).toEqual({ data: [], total: 6, page: 4, size: 20 });
  });
});

describe('GET /mi-clinica/ordenes', () => {
  it('clamps the size and ties the order by id', async () => {
    const { service, qb } = miClinica({ total: 2, rows: [{ id: '1' }] });

    const res = await service.listOrdenes('usuario-1', undefined, '1', '500');

    expect(res).toMatchObject({ total: 2, page: 1, size: MAX_SIZE });
    expect(qb.orderBy).toHaveBeenCalledWith({
      'o.fechaCreacion': 'DESC',
      'o.id': 'DESC',
    });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const { service } = miClinica({ total: 2 });

    const res = await service.listOrdenes('usuario-1', undefined, '5', '20');

    expect(res).toEqual({ data: [], total: 2, page: 5, size: 20 });
  });
});

describe('GET /mi-clinica/cuentas-cobro', () => {
  it('clamps the size and ties the order by id', async () => {
    const { service, qb } = miClinica({ total: 2, rows: [{ id: '1' }] });

    const res = await service.listCuentasCobro('usuario-1', undefined, '1', '500');

    expect(res).toMatchObject({ total: 2, page: 1, size: MAX_SIZE });
    expect(qb.orderBy).toHaveBeenCalledWith({
      'cc.createdAt': 'DESC',
      'cc.id': 'DESC',
    });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const { service } = miClinica({ total: 2 });

    const res = await service.listCuentasCobro('usuario-1', undefined, '5', '20');

    expect(res).toEqual({ data: [], total: 2, page: 5, size: 20 });
  });
});

describe('GET /mi-clinica/pacientes', () => {
  it('pages with an id tiebreak and clamps the size', async () => {
    const repo = {
      createQueryBuilder: vi.fn(),
    };
    const pacienteRepo = {
      createQueryBuilder: vi.fn(() => fakeQueryBuilder({ total: 1, rows: [{ id: '7' }] })),
    };
    const service = new PacientesService(
      pacienteRepo as never,
      repo as never,
      {} as never,
    );

    const res = await service.listForClinica('2', undefined, '1', '500');

    expect(res).toMatchObject({ total: 1, page: 1, size: MAX_SIZE });
    const qb = pacienteRepo.createQueryBuilder.mock.results[0]?.value as ReturnType<
      typeof fakeQueryBuilder
    >;
    expect(qb.addOrderBy).toHaveBeenCalledWith('paciente.id', 'ASC');
    expect(qb.take).toHaveBeenCalledWith(MAX_SIZE);
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const service = new PacientesService(
      { createQueryBuilder: vi.fn(() => fakeQueryBuilder({ total: 3 })) } as never,
      {} as never,
      {} as never,
    );

    const res = await service.listForClinica('2', undefined, '9', '20');

    expect(res).toEqual({ data: [], total: 3, page: 9, size: 20 });
  });
});

describe('GET /mi-clinica/servicios', () => {
  it('pages with an id tiebreak and clamps the size', async () => {
    const servicioRepo = {
      findAndCount: vi.fn(async () => [[{ id: '4' }], 1]),
    };
    const service = miClinica({ servicioRepo }).service;

    const res = await service.listServicios('1', '500');

    expect(servicioRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: MAX_SIZE,
        order: { nombre: 'ASC', id: 'ASC' },
      }),
    );
    expect(res).toMatchObject({ total: 1, page: 1, size: MAX_SIZE });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const service = miClinica({
      servicioRepo: { findAndCount: vi.fn(async () => [[], 0]) },
    }).service;

    const res = await service.listServicios('9', '20');

    expect(res).toEqual({ data: [], total: 0, page: 9, size: 20 });
  });
});

describe('GET /mi-clinica/pacientes?doctorId=', () => {
  it('pages the doctor patients with an id tiebreak', async () => {
    const repo = {
      findAndCount: vi.fn(async () => [[{ pacienteId: '7' }], 1]),
    };
    const service = new MiClinicaService(
      { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
      {} as never,
      {} as never,
      {} as never,
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { buscarIds: vi.fn(async () => null) } as never,
    );
    vi.spyOn(service, 'getDoctor').mockResolvedValue({} as never);

    const res = await service.listPacientesDelDoctor('usuario-1', '3', undefined, '2', '500');

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: MAX_SIZE,
        take: MAX_SIZE,
        order: { fechaAsignacion: 'DESC', pacienteId: 'DESC' },
      }),
    );
    expect(res).toMatchObject({ total: 1, page: 2, size: MAX_SIZE });
  });

  it('returns an empty page with the correct total beyond the end', async () => {
    const service = new MiClinicaService(
      { findOneBy: vi.fn(async () => ({ clinicaId: '2' })) } as never,
      {} as never,
      {} as never,
      {} as never,
      { findAndCount: vi.fn(async () => [[], 4]) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { buscarIds: vi.fn(async () => null) } as never,
    );
    vi.spyOn(service, 'getDoctor').mockResolvedValue({} as never);

    const res = await service.listPacientesDelDoctor('usuario-1', '3', undefined, '9', '20');

    expect(res).toEqual({ data: [], total: 4, page: 9, size: 20 });
  });
});

describe('GET /cuentas-cobro · group filter', () => {
  it('filters in SQL before paginating and counts the filtered set', async () => {
    const { service, qb } = cuentas({ total: 2, rows: [{ id: '1' }] });

    const res = await service.findAll(undefined, undefined, '1', '10', {
      grupo: 'pagadas',
    });

    expect(qb.andWhere).toHaveBeenCalledWith('cc.estado IN (:...estados)', {
      estados: ['pagada'],
    });
    expect(qb.getCount).toHaveBeenCalled();
    expect(res).toMatchObject({ total: 2, page: 1, size: 10 });
  });

  it('keeps the page window over the filtered set', async () => {
    const { service, qb } = cuentas({ total: 30 });

    const res = await service.findAll(undefined, undefined, '2', '10', {
      grupo: 'pendientes',
    });

    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.getCount).toHaveBeenCalled();
    expect(res).toMatchObject({ total: 30, page: 2, size: 10 });
  });

  it('returns an empty page with the filtered total beyond the end', async () => {
    const { service, qb } = cuentas({ total: 3 });

    const res = await service.findAll(undefined, undefined, '4', '10', {
      grupo: 'pendientes',
    });

    expect(qb.getMany).not.toHaveBeenCalled();
    expect(res).toEqual({ data: [], total: 3, page: 4, size: 10 });
  });
});

describe('GET /usuarios · active filter', () => {
  it('filters in SQL and counts the filtered set', async () => {
    const { service, qb } = usuarios({
      total: 1,
      rows: [{ id: '1', rol: { id: '1', nombre: 'clinica' } }],
    });

    const res = await service.findAll(undefined, '1', '10', { activo: false });

    expect(qb.andWhere).toHaveBeenCalledWith('u.activo = :activo', {
      activo: false,
    });
    expect(res.total).toBe(1);
  });
});

describe('GET /admin/catalogo/servicios · active filter', () => {
  it('filters in SQL and counts the filtered set', async () => {
    const { service, qb } = servicios({ total: 2, rows: [{ id: '1' }] });

    const res = await service.listAdmin(undefined, '1', '10', { activo: true });

    expect(qb.andWhere).toHaveBeenCalledWith('s.activo = :activo', {
      activo: true,
    });
    expect(res.total).toBe(2);
  });
});

describe('GET /clinicas · sort', () => {
  it('maps the whitelisted sort and keeps the id tiebreak', async () => {
    const { service, qb } = clinicas({ total: 1, rows: [{ id: '1' }] });

    await service.findAll(undefined, '1', '10', { sort: 'nombre', order: 'asc' });

    expect(qb.orderBy).toHaveBeenCalledWith({
      'c.nombre': 'ASC',
      'c.id': 'ASC',
    });
  });

  it('falls back to the endpoint default for an unknown sort', async () => {
    const { service, qb } = clinicas({ total: 1, rows: [{ id: '1' }] });

    await service.findAll(undefined, '1', '10', { sort: 'password' });

    expect(qb.orderBy).toHaveBeenCalledWith({
      'c.nombre': 'ASC',
      'c.id': 'ASC',
    });
  });
});
