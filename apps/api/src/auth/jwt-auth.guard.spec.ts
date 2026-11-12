import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@nestjs/passport', () => ({
  AuthGuard: () => class { async canActivate() { return true; } },
}));

import { JwtAuthGuard } from './jwt-auth.guard.js';

function contexto(method: string, path: string, scope?: 'whatsapp-bot') {
  const request = { method, path, user: { id: 'u', rol: 'clinica', sid: 's', ...(scope ? { scope } : {}) } };
  return {
    getHandler: () => ({}),
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe('JwtAuthGuard', () => {
  it('permite el token whatsapp-bot en GET /mi-clinica/ordenes y rechaza POST /mi-clinica/doctores', async () => {
    const guard = new JwtAuthGuard(new Reflector());
    await expect(guard.canActivate(contexto('GET', '/mi-clinica/ordenes', 'whatsapp-bot'))).resolves.toBe(true);
    await expect(guard.canActivate(contexto('POST', '/mi-clinica/doctores', 'whatsapp-bot'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite un token normal en POST /mi-clinica/doctores', async () => {
    const guard = new JwtAuthGuard(new Reflector());
    await expect(guard.canActivate(contexto('POST', '/mi-clinica/doctores'))).resolves.toBe(true);
  });
});

describe('JwtAuthGuard · ruta de PDF de cuentas de cobro', () => {
  it('permite el token whatsapp-bot en GET /mi-clinica/cuentas-cobro/:id/pdf y sigue denegando escrituras', async () => {
    const guard = new JwtAuthGuard(new Reflector());
    await expect(
      guard.canActivate(contexto('GET', '/mi-clinica/cuentas-cobro/3/pdf', 'whatsapp-bot')),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contexto('POST', '/mi-clinica/cuentas-cobro/3/pdf', 'whatsapp-bot')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
