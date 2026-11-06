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
export async function odontogramaPng(svg: string): Promise<Buffer | null> {
  try {
    // Especificador en una variable: así el build no exige `sharp` instalada.
    const modulo = 'sharp';
    const cargado = (await import(modulo)) as { default: SharpFactory };
    return await cargado.default(Buffer.from(svg)).png().toBuffer();
  } catch (err) {
    logger.warn(
      `Odontograma omitido del PDF: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
