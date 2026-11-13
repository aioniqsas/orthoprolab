import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { ConfiguracionBot } from './configuracion-bot.entity.js';
import { ConfiguracionBotService } from './configuracion-bot.service.js';

const repo = (row: ConfiguracionBot | null) =>
  ({
    findOne: vi.fn(async () => row),
    save: vi.fn(async (data: Partial<ConfiguracionBot>) => ({ ...row, ...data })),
  }) as unknown as Repository<ConfiguracionBot>;

describe('ConfiguracionBotService', () => {
  it('getNombre devuelve el valor almacenado', async () => {
    const service = new ConfiguracionBotService(
      repo({ clave: 'nombre', valor: 'Viejo', actualizadoEn: new Date() }),
    );
    await expect(service.getNombre()).resolves.toEqual({ nombre: 'Viejo' });
  });

  it('getNombre cae al nombre por defecto si la fila no existe', async () => {
    const service = new ConfiguracionBotService(repo(null));
    await expect(service.getNombre()).resolves.toEqual({ nombre: 'Aioniq' });
  });

  it('guardarNombre hace upsert por clave nombre y devuelve lo almacenado', async () => {
    const r = repo({ clave: 'nombre', valor: 'Viejo', actualizadoEn: new Date() });
    const service = new ConfiguracionBotService(r);
    await expect(service.guardarNombre('Nuevo')).resolves.toEqual({ nombre: 'Nuevo' });
    expect(r.save).toHaveBeenCalledWith({ clave: 'nombre', valor: 'Nuevo' });
  });
});
