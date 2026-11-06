import sharp from 'sharp';
import { odontogramaPng } from './odontograma-png.js';
import { odontogramaSvg } from './odontograma-svg.js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('odontogramaPng', () => {
  it('rasteriza el SVG a un PNG de 600×420', async () => {
    const png = await odontogramaPng(odontogramaSvg({ dientes: [11, 46] }));

    expect(png).not.toBeNull();
    expect(png!.subarray(0, 8)).toEqual(PNG_MAGIC);

    const meta = await sharp(png!).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(600);
    expect(meta.height).toBe(420);
  });
});
