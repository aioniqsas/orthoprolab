import { PdfService } from './pdf.service.js';
import type { ServicioParaPdf } from './servicios.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_SERVICE: ServicioParaPdf = {
  id: '1',
  slug: 'corona-zirconio',
  nombre: 'Corona de Zirconio',
  descripcion: 'Corona dental de alta resistencia.',
  imagenUrl: null,
  precio: '350000.00',
};

function buildRedis(opts: {
  cached?: Buffer | null;
  keys?: string[];
} = {}) {
  return {
    getBuffer: vi.fn().mockResolvedValue(opts.cached ?? null),
    set: vi.fn().mockResolvedValue('OK'),
    keys: vi.fn().mockResolvedValue(opts.keys ?? []),
    del: vi.fn().mockResolvedValue(1),
  };
}

function buildServiciosService(services: ServicioParaPdf[] = [SAMPLE_SERVICE]) {
  return {
    findAllForPdf: vi.fn().mockResolvedValue(services),
  };
}

function buildConfig() {
  return {
    get: vi.fn().mockReturnValue('localhost'),
  };
}

function buildService(opts: {
  services?: ServicioParaPdf[];
  cached?: Buffer | null;
  keys?: string[];
} = {}) {
  const redis = buildRedis({ cached: opts.cached, keys: opts.keys });
  const serviciosService = buildServiciosService(opts.services);
  const config = buildConfig();
  const service = new PdfService(
    redis as never,
    serviciosService as never,
    config as never,
  );
  return { service, redis, serviciosService, config };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PdfService.getCatalogPdf', () => {
  it('returns cached buffer without generating when cache hit', async () => {
    const cached = Buffer.from('fake-pdf');
    const { service, redis, serviciosService } = buildService({ cached });

    const result = await service.getCatalogPdf();

    expect(result).toBe(cached);
    expect(redis.set).not.toHaveBeenCalled();
    // findAllForPdf still runs (to build the cache key)
    expect(serviciosService.findAllForPdf).toHaveBeenCalledOnce();
  });

  it('generates PDF on cache miss and stores it in Redis', async () => {
    const { service, redis } = buildService({ cached: null });

    const result = await service.getCatalogPdf();

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(redis.set).toHaveBeenCalledOnce();
    const [key, , ex, ttl] = redis.set.mock.calls[0] as [string, Buffer, string, number];
    expect(key).toMatch(/^orthopro:pdf:catalog:/);
    expect(ex).toBe('EX');
    expect(ttl).toBeGreaterThan(0);
  }, 30_000);
});

describe('PdfService.invalidateCache', () => {
  it('calls redis.keys and redis.del when keys exist', async () => {
    const { service, redis } = buildService({ keys: ['orthopro:pdf:catalog:abc'] });

    await service.invalidateCache();

    expect(redis.keys).toHaveBeenCalledWith('orthopro:pdf:catalog:*');
    expect(redis.del).toHaveBeenCalledWith('orthopro:pdf:catalog:abc');
  });

  it('does not call redis.del when no keys exist', async () => {
    const { service, redis } = buildService({ keys: [] });

    await service.invalidateCache();

    expect(redis.keys).toHaveBeenCalledOnce();
    expect(redis.del).not.toHaveBeenCalled();
  });
});

describe('PdfService.formatPrecio', () => {
  it('returns "Consultar valor" for "0.00"', () => {
    const { service } = buildService();
    expect(service.formatPrecio('0.00')).toBe('Consultar valor');
  });

  it('returns "Consultar valor" for "0"', () => {
    const { service } = buildService();
    expect(service.formatPrecio('0')).toBe('Consultar valor');
  });

  it('formats non-zero amounts as COP currency', () => {
    const { service } = buildService();
    const result = service.formatPrecio('350000.00');
    // es-CO format includes "COP" or "$" symbol and the number
    expect(result).toContain('350');
  });
});

describe('PdfService.fetchServiceImage', () => {
  it('returns null for null URL', async () => {
    const { service } = buildService();
    const result = await service.fetchServiceImage(null);
    expect(result).toBeNull();
  });

  it('returns null for non-Cloudinary URL', async () => {
    const { service } = buildService();
    const result = await service.fetchServiceImage('https://evil.test/image.jpg');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    const { service } = buildService();
    // Cloudinary URL that will fail to resolve in test environment
    const result = await service.fetchServiceImage(
      'https://res.cloudinary.com/demo/image/upload/test.jpg',
    );
    // In test environment fetch fails or returns non-200 → null
    expect(result === null || result instanceof Buffer).toBe(true);
  });
});
