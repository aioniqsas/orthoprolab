import { Logger } from '@nestjs/common';

const logger = new Logger('OdontogramaPng');

type SharpFactory = (input: Buffer) => { png: () => { toBuffer: () => Promise<Buffer> } };

/**
 * Rasteriza el SVG del odontograma a PNG.
 *
 * `sharp` se instala aparte (`bun add sharp` dentro de `apps/api`). Sin ella el
 * PDF se emite sin la figura y queda un aviso en el log, en lugar de perder el
 * correo completo.
 */
/** Maximum rasterized odontograms kept in memory (~45 KB each). */
const MAX_CACHE = 200;

/**
 * Cache by SVG: the SVG only depends on the set of teeth, which repeats across
 * orders, so the rasterization (≈20 ms of CPU) runs once per distinct set.
 * Only successful renders are cached; the buffers are read-only for callers.
 */
const cache = new Map<string, Buffer>();

/** Test hook: empties the rasterization cache. */
export function limpiarCacheOdontograma(): void {
  cache.clear();
}

export async function odontogramaPng(svg: string): Promise<Buffer | null> {
  const enCache = cache.get(svg);
  if (enCache) return enCache;
  try {
    // Especificador en una variable: así el build no exige `sharp` instalada.
    const modulo = 'sharp';
    const cargado = (await import(modulo)) as { default: SharpFactory };
    const png = await cargado.default(Buffer.from(svg)).png().toBuffer();
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
    cache.set(svg, png);
    return png;
  } catch (err) {
    logger.warn(
      `Odontograma omitido del PDF: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
