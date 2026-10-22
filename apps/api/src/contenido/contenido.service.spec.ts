import { BadRequestException } from '@nestjs/common';
import {
  CONTENIDO_CAMPOS,
  CONTENIDO_GRUPOS,
  IMAGENES_DISPONIBLES,
  MAX_PARRAFO,
  MAX_TEXTO,
} from './contenido.schema.js';
import type { ContenidoWeb } from './contenido.entity.js';
import { ContenidoService } from './contenido.service.js';

/** Image each `imagen` field holds today on the public site. */
const IMAGEN_ACTUAL: Record<string, string> = {
  'site.og_imagen': '/images/hero.jpg',
  'home.hero.imagen': '/images/hero.jpg',
  'home.antes.imagen':
    '/images/tecnico-laboratorio-dental-ajustando-protesis.webp',
  'home.cierre.imagen':
    '/images/protesis-dental-completa-laboratorio-medellin.webp',
  'nosotros.hero.imagen':
    '/images/tecnicos-laboratorio-dental-trabajando-medellin.webp',
  'nosotros.mision.imagen':
    '/images/tecnico-laboratorio-dental-ajustando-protesis.webp',
  'nosotros.vision.imagen':
    '/images/protesis-total-superior-ortopro-lab-medellin.webp',
  'nosotros.cierre.imagen':
    '/images/protesis-dental-completa-laboratorio-medellin.webp',
  'pagos.qr.imagen': '/images/qr-cuenta.webp',
};

/** Fake repository over an in-memory map, so reads see earlier writes. */
function build(inicial: Record<string, string> = {}) {
  const store = new Map(Object.entries(inicial));
  const repo = {
    find: vi.fn(async (): Promise<ContenidoWeb[]> =>
      [...store].map(([clave, valor]) => ({ clave, valor }) as ContenidoWeb),
    ),
    create: vi.fn((row: ContenidoWeb) => row),
    save: vi.fn(async (rows: ContenidoWeb[]) => {
      for (const row of rows) store.set(row.clave, row.valor);
      return rows;
    }),
    delete: vi.fn(async (claves: string[]) => {
      for (const clave of claves) store.delete(clave);
      return { affected: claves.length };
    }),
  };
  const eventos = { emitir: vi.fn() };
  const service = new ContenidoService(repo as never, eventos as never);
  return { service, repo, eventos, store };
}

describe('ContenidoService.mapaPublico', () => {
  it('returns only the stored keys', async () => {
    const { service } = build({ 'home.hero.titulo': 'Hola' });
    expect(await service.mapaPublico()).toEqual({ 'home.hero.titulo': 'Hola' });
  });

  it('returns an empty object when nothing was saved', async () => {
    const { service } = build();
    expect(await service.mapaPublico()).toEqual({});
  });
});

describe('ContenidoService.listAdmin', () => {
  it('lists every schema field with valor null and the allowed images', async () => {
    const { service } = build();
    const { grupos, imagenes } = await service.listAdmin();

    expect(grupos.map((g) => g.grupo)).toEqual(
      CONTENIDO_GRUPOS.map((g) => g.grupo),
    );
    expect(grupos.flatMap((g) => g.campos)).toHaveLength(
      CONTENIDO_CAMPOS.length,
    );
    expect(grupos.flatMap((g) => g.campos).every((c) => c.valor === null)).toBe(
      true,
    );
    expect(imagenes).toEqual(IMAGENES_DISPONIBLES);
  });

  it('reports the stored value when there is one', async () => {
    const { service } = build({ 'home.hero.titulo': 'Guardado' });
    const campos = (await service.listAdmin()).grupos.flatMap((g) => g.campos);
    expect(campos.find((c) => c.clave === 'home.hero.titulo')?.valor).toBe(
      'Guardado',
    );
  });
});

describe('ContenidoService.guardar', () => {
  it('upserts the given values and returns the refreshed groups', async () => {
    const { service, repo } = build();
    await service.guardar({
      'home.hero.titulo': 'Nuevo',
      'home.hero.subtitulo': 'Un texto',
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save.mock.calls[0]?.[0]).toEqual([
      { clave: 'home.hero.titulo', valor: 'Nuevo' },
      { clave: 'home.hero.subtitulo', valor: 'Un texto' },
    ]);
    expect(repo.delete).not.toHaveBeenCalled();
    expect(await service.mapaPublico()).toEqual({
      'home.hero.titulo': 'Nuevo',
      'home.hero.subtitulo': 'Un texto',
    });
  });

  it('deletes the row of an empty value', async () => {
    const { service, repo } = build({ 'home.hero.titulo': 'Viejo' });
    await service.guardar({ 'home.hero.titulo': '' });

    expect(repo.delete).toHaveBeenCalledWith(['home.hero.titulo']);
    expect(repo.save).not.toHaveBeenCalled();
    expect(await service.mapaPublico()).toEqual({});
  });

  it('handles an empty batch without touching the database', async () => {
    const { service, repo, eventos } = build();
    await service.guardar({});

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
    expect(eventos.emitir).toHaveBeenCalledWith('contenido');
  });

  it('saves nothing when one value in the batch is invalid', async () => {
    const { service, repo } = build();
    await expect(
      service.guardar({
        'home.hero.titulo': 'Bien',
        'home.hero.subtitulo': 'a'.repeat(MAX_PARRAFO + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('rejects unknown keys listing them', async () => {
    const { service, repo } = build();
    await expect(
      service.guardar({ 'home.hero.titulo': 'x', 'home.hero.inventado': 'y' }),
    ).rejects.toThrow(/home\.hero\.inventado/);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('accepts text up to the limit and rejects longer', async () => {
    const { service } = build();
    await service.guardar({ 'home.hero.titulo': 'a'.repeat(MAX_TEXTO) });
    await expect(
      service.guardar({ 'home.hero.titulo': 'a'.repeat(MAX_TEXTO + 1) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts paragraphs up to the limit and rejects longer', async () => {
    const { service } = build();
    await service.guardar({ 'home.hero.subtitulo': 'a'.repeat(MAX_PARRAFO) });
    await expect(
      service.guardar({ 'home.hero.subtitulo': 'a'.repeat(MAX_PARRAFO + 1) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts an allowed image and rejects any other value', async () => {
    const { service } = build();
    await service.guardar({
      'home.hero.imagen': '/images/protesis-total-superior-acrilico.webp',
    });
    await expect(
      service.guardar({ 'home.hero.imagen': '/images/no-existe.webp' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.guardar({ 'home.hero.imagen': 'https://evil.test/x.jpg' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows clearing an image (empty string)', async () => {
    const { service, store } = build({ 'home.hero.imagen': '/images/hero.jpg' });
    await service.guardar({ 'home.hero.imagen': '' });
    expect(store.has('home.hero.imagen')).toBe(false);
  });
});

describe('ContenidoService events', () => {
  it('emits one contenido event per successful save', async () => {
    const { service, eventos } = build();
    await service.guardar({ 'home.hero.titulo': 'Nuevo' });
    expect(eventos.emitir.mock.calls).toEqual([['contenido']]);
  });

  it('does not emit when the save fails', async () => {
    const { service, eventos } = build();
    await expect(
      service.guardar({ 'home.hero.inventado': 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(eventos.emitir).not.toHaveBeenCalled();
  });
});

describe('contenido schema', () => {
  const claves = CONTENIDO_CAMPOS.map((campo) => campo.clave);

  it('has a unique, well-formed clave per field', () => {
    expect(new Set(claves).size).toBe(claves.length);
    for (const clave of claves) {
      expect(clave).toMatch(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/);
    }
  });

  it('labels every field in Spanish with a known tipo', () => {
    for (const grupo of CONTENIDO_GRUPOS) {
      expect(grupo.grupo).not.toBe('');
      expect(grupo.campos.length).toBeGreaterThan(0);
      for (const campo of grupo.campos) {
        expect(campo.etiqueta.trim()).not.toBe('');
        expect(['texto', 'parrafo', 'imagen']).toContain(campo.tipo);
      }
    }
  });

  it('points every imagen field at an image in the allowed list', () => {
    const imagenes = CONTENIDO_CAMPOS.filter((campo) => campo.tipo === 'imagen')
      .map((campo) => campo.clave)
      .sort();
    expect(imagenes).toEqual(Object.keys(IMAGEN_ACTUAL).sort());
    for (const clave of imagenes) {
      expect(IMAGENES_DISPONIBLES).toContain(IMAGEN_ACTUAL[clave]);
    }
  });

  it('lists only /images files, without duplicates', () => {
    expect(new Set(IMAGENES_DISPONIBLES).size).toBe(
      IMAGENES_DISPONIBLES.length,
    );
    for (const imagen of IMAGENES_DISPONIBLES) {
      expect(imagen).toMatch(/^\/images\/[a-z0-9-]+\.(jpe?g|png|webp)$/);
    }
  });

  it('covers the hero and payment images the site uses today', () => {
    for (const imagen of Object.values(IMAGEN_ACTUAL)) {
      expect(IMAGENES_DISPONIBLES).toContain(imagen);
    }
  });
});
