import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Mock } from 'vitest';
import { ServiciosService } from './servicios.service.js';
import {
  ImageStorageError,
  ImageStorageNotConfiguredError,
  type ImageStorage,
} from './image-storage.js';
import type { Servicio } from './servicio.entity.js';

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(64),
]);

const row = (over: Partial<Servicio> = {}): Servicio =>
  ({
    id: '7',
    slug: 'x',
    nombre: 'X',
    descripcion: null,
    precio: '0.00',
    activo: true,
    imagenUrl: null,
    imagenPublicId: null,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    ...over,
  }) as Servicio;

function build(opts: {
  found?: Servicio | null;
  storage?: Partial<Record<'upload' | 'delete', Mock>>;
}) {
  const found = opts.found === undefined ? row() : opts.found;
  const repo = {
    findOneBy: vi.fn().mockResolvedValue(found),
    save: vi.fn((s: Servicio) => Promise.resolve(s)),
    remove: vi.fn().mockResolvedValue(undefined),
    existsBy: vi.fn().mockResolvedValue(false),
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn((s: Partial<Servicio>) => s as Servicio),
  };
  const storage: Record<'upload' | 'delete', Mock> = {
    upload: vi.fn().mockResolvedValue({
      url: 'https://res.cloudinary.com/demo/image/upload/new.jpg',
      publicId: 'new',
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...opts.storage,
  };
  const pdfRedis = {
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(0),
  };
  const eventos = { emitir: vi.fn() };
  const service = new ServiciosService(
    repo as never,
    storage as unknown as ImageStorage,
    pdfRedis as never,
    eventos as never,
  );
  return { service, repo, storage, eventos };
}

describe('ServiciosService.remove', () => {
  it('hard deletes and removes the image', async () => {
    const { service, repo, storage } = build({
      found: row({ imagenPublicId: 'pid' }),
    });
    const result = await service.remove('7');
    expect(result.kind).toBe('deleted');
    expect(repo.remove).toHaveBeenCalled();
    expect(storage.delete).toHaveBeenCalledWith('pid');
  });

  it('still deletes when the image cleanup fails', async () => {
    const { service, repo } = build({
      found: row({ imagenPublicId: 'pid' }),
      storage: {
        delete: vi.fn().mockRejectedValue(new ImageStorageError('x')),
      },
    });
    const result = await service.remove('7');
    expect(result.kind).toBe('deleted');
    expect(repo.remove).toHaveBeenCalled();
  });

  it('throws 404 for an unknown id', async () => {
    const { service } = build({ found: null });
    await expect(service.remove('9')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ServiciosService.setImage', () => {
  it('stores the new image and deletes the previous asset', async () => {
    const { service, repo, storage } = build({
      found: row({ imagenPublicId: 'old', slug: 'x' }),
    });
    const out = await service.setImage('7', JPEG);
    expect(storage.upload).toHaveBeenCalledWith(JPEG, { publicIdHint: 'x' });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        imagenUrl: 'https://res.cloudinary.com/demo/image/upload/new.jpg',
        imagenPublicId: 'new',
      }),
    );
    expect(storage.delete).toHaveBeenCalledWith('old');
    expect(out.imagenUrl).toContain('res.cloudinary.com');
  });

  it('does not fail when deleting the previous asset fails', async () => {
    const { service } = build({
      found: row({ imagenPublicId: 'old' }),
      storage: { delete: vi.fn().mockRejectedValue(new Error('down')) },
    });
    await expect(service.setImage('7', JPEG)).resolves.toBeDefined();
  });

  it('rejects empty and non-image buffers with 400 before touching storage', async () => {
    const { service, storage } = build({});
    await expect(service.setImage('7', Buffer.alloc(0))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.setImage('7', Buffer.from('<svg></svg>')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('maps a missing configuration to 503', async () => {
    const { service } = build({
      storage: {
        upload: vi.fn().mockRejectedValue(new ImageStorageNotConfiguredError()),
      },
    });
    await expect(service.setImage('7', JPEG)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps a provider failure to 503 as well', async () => {
    const { service } = build({
      storage: {
        upload: vi.fn().mockRejectedValue(new ImageStorageError('boom')),
      },
    });
    await expect(service.setImage('7', JPEG)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects a returned URL that is not a Cloudinary https URL', async () => {
    const { service, repo, storage } = build({
      storage: {
        upload: vi.fn().mockResolvedValue({
          url: 'https://evil.test/a.jpg',
          publicId: 'p',
        }),
      },
    });
    await expect(service.setImage('7', JPEG)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(storage.delete).toHaveBeenCalledWith('p');
  });

  it('throws 404 for an unknown service without uploading', async () => {
    const { service, storage } = build({ found: null });
    await expect(service.setImage('7', JPEG)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe('ServiciosService.create', () => {
  it('maps a unique violation on nombre to 409', async () => {
    const { service, repo } = build({});
    repo.save.mockRejectedValue(
      Object.assign(new Error('dup'), {
        driverError: {
          code: '23505',
          constraint: 'UQ_20f03be6b4f4f61b0485182c1e5',
        },
      }),
    );
    await expect(
      service.create({ nombre: 'X', precio: '1.00' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ServiciosService events', () => {
  it('emits a catalog change after each successful mutation', async () => {
    const { service, eventos } = build({});
    await service.create({ nombre: 'Nuevo', precio: '100.00' } as never);
    await service.update('7', { nombre: 'Otro' });
    await service.remove('7');
    await service.setImage('7', JPEG);

    expect(eventos.emitir.mock.calls.map(([tipo]) => tipo)).toEqual([
      'creado',
      'actualizado',
      'eliminado',
      'imagen',
    ]);
  });
});
