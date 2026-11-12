import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import type { Usuario } from '../usuarios/usuario.entity.js';

const usuario = (extra: Partial<Usuario>): Usuario =>
  ({
    id: 'u-1',
    activo: true,
    correo: 'u@x.com',
    nombres: 'U',
    apellidos: 'X',
    rol: { nombre: 'clinica' },
    clinicaId: '1',
    clinica: { activo: true },
    passwordHash: 'hash',
    ...extra,
  }) as unknown as Usuario;

const mockRepo = (user: Usuario | null) => ({
  findOne: vi.fn(async () => user),
  createQueryBuilder: vi.fn(() => ({
    innerJoinAndSelect: function () {
      return this;
    },
    leftJoinAndSelect: function () {
      return this;
    },
    where: function () {
      return this;
    },
    getOne: vi.fn(async () => user),
  })),
});

const deps = (repo: ReturnType<typeof mockRepo>) => ({
  usuarios: repo,
  dataSource: {} as never,
  passwords: { hash: vi.fn(async () => 'h'), verify: vi.fn(async () => true) },
  crypto: { loginKey: vi.fn(() => 'k') },
  jwt: { signAsync: vi.fn(async () => 'access-token') },
  sessions: {
    create: vi.fn(async () => ({
      refreshToken: 'r',
      familiaId: 'f',
      usuarioId: 'u-1',
      rol: 'clinica',
    })),
    rotate: vi.fn(async () => ({
      status: 'rotated',
      refreshToken: 'r2',
      usuarioId: 'u-1',
      rol: 'clinica',
      familiaId: 'f',
    })),
    revokeAllForUser: vi.fn(async () => undefined),
  },
  attempts: { lockedSeconds: vi.fn(async () => 0), recordFailure: vi.fn(), reset: vi.fn() },
  mailerAuth: {} as never,
  config: {} as never,
});

const make = (repo: ReturnType<typeof mockRepo>) =>
  new AuthService(
    repo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

let svc: AuthService;
let repo: ReturnType<typeof mockRepo>;
let d: ReturnType<typeof deps>;

const montar = (u: Usuario | null) => {
  repo = mockRepo(u);
  d = deps(repo);
  svc = new AuthService(
    d.usuarios as never,
    d.dataSource,
    d.passwords as never,
    d.crypto as never,
    d.jwt as never,
    d.sessions as never,
    d.attempts as never,
    d.mailerAuth,
    d.config,
  );
};

beforeEach(() => {
  montar(usuario({}));
});

describe('AuthService · clínica inactiva (S2/S4)', () => {
  it('me rechaza al usuario de una clínica desactivada con 403', async () => {
    montar(usuario({ clinica: { activo: false } } as Partial<Usuario>));
    await expect(svc.me('u-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(d.sessions.create).not.toHaveBeenCalled();
  });

  it('login rechaza al usuario de una clínica desactivada con el error genérico de credenciales y no crea sesión', async () => {
    montar(usuario({ clinica: { activo: false } } as Partial<Usuario>));
    const result = await svc.login({ correo: 'u@x.com', password: 'p' } as never);
    expect(result.status).toBe('invalid');
    expect(d.sessions.create).not.toHaveBeenCalled();
    expect(d.jwt.signAsync).not.toHaveBeenCalled();
  });

  it('refresh no emite token para el usuario de una clínica desactivada', async () => {
    montar(usuario({ clinica: { activo: false } } as Partial<Usuario>));
    await expect(svc.refresh('raw')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(d.jwt.signAsync).not.toHaveBeenCalled();
    expect(d.sessions.revokeAllForUser).toHaveBeenCalledWith('u-1');
  });

  it('un administrador sin clínica sigue autenticando', async () => {
    montar(
      usuario({
        rol: { nombre: 'administrador' },
        clinicaId: null,
        clinica: null,
      } as Partial<Usuario>),
    );
    const result = await svc.login({ correo: 'u@x.com', password: 'p' } as never);
    expect(result.status).toBe('ok');
    await expect(svc.me('u-1')).resolves.toMatchObject({ id: 'u-1' });
  });

  it('el usuario de una clínica activa sigue autenticando', async () => {
    const result = await svc.login({ correo: 'u@x.com', password: 'p' } as never);
    expect(result.status).toBe('ok');
    await expect(svc.me('u-1')).resolves.toMatchObject({ id: 'u-1' });
  });

  it('refresh emite token para el usuario de una clínica activa', async () => {
    const result = await svc.refresh('raw');
    expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'r2' });
  });
});
