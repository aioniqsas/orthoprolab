import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import type { Redis } from 'ioredis';
import type { EnvConfig } from '../config/env.validation.js';
import { ServiciosService, type ServicioParaPdf } from './servicios.service.js';
import { isCloudinaryUrl } from './image-storage.js';
import { PDF_REDIS, invalidatePdfCache } from './pdf-cache.js';

export { PDF_REDIS } from './pdf-cache.js';

const CACHE_KEY = 'orthopro:pdf:catalog';
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 h safety net

// Path to bundled font files relative to this file's location.
// NestJS compiles src/ → dist/ (flat, no src/ prefix inside dist), so 3 levels up
// reaches apps/api/ for both the source path and the compiled path:
//   source:   src/catalogo/pdf.service.ts  → ../../../ → api/
//   compiled: dist/catalogo/pdf.service.js → ../../../ → api/
// Fonts: Outfit uses WOFF (full latin glyphs); Poppins uses TTF.
const FONTS_DIR = join(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  'assets',
  'fonts',
);

// Palette (matches @repo/theme)
const C = {
  bg: '#171717',
  body: '#f5f5f5',
  title: '#56898f',
  highlight: '#48fbc1',
  muted: '#b6bebf',
  raised: '#1f2425',
} as const;

// Max size for a fetched service image (2 MB)
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
// Fetch timeout for service images
const IMAGE_FETCH_TIMEOUT_MS = 5_000;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @Inject(PDF_REDIS) private readonly redis: Redis,
    private readonly serviciosService: ServiciosService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  /** Returns the cached PDF or generates a fresh one. */
  async getCatalogPdf(): Promise<Buffer> {
    const services = await this.serviciosService.findAllForPdf();
    const cacheKey = this.buildCacheKey(services);

    const cached = await this.redis.getBuffer(cacheKey).catch(() => null);
    if (cached) return cached;

    const pdf = await this.generate(services);
    await this.redis.set(cacheKey, pdf, 'EX', CACHE_TTL_SECONDS).catch(() => {});
    return pdf;
  }

  /** Invalidates the cached PDF. Call after any catalog mutation. */
  async invalidateCache(): Promise<void> {
    await invalidatePdfCache(this.redis);
  }

  private buildCacheKey(services: ServicioParaPdf[]): string {
    const fingerprint = services
      .map((s) => `${s.id}:${s.imagenUrl ?? ''}:${s.precio}`)
      .join('|');
    const hash = createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
    return `${CACHE_KEY}:${hash}`;
  }

  private async generate(services: ServicioParaPdf[]): Promise<Buffer> {
    // Fetch all images first (in parallel), before opening the PDFDocument stream
    const imageBuffers = await Promise.all(
      services.map((s) => this.fetchServiceImage(s.imagenUrl)),
    );

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 56, bottom: 56, left: 56, right: 56 },
        info: { Title: 'Catálogo OrthoPro Lab', Author: 'OrthoPro Lab' },
      });

      // Register fonts (WOFF for Outfit, TTF for Poppins — fontkit handles both)
      doc.registerFont('Outfit', join(FONTS_DIR, 'Outfit-Regular.woff'));
      doc.registerFont('Outfit-Bold', join(FONTS_DIR, 'Outfit-Bold.woff'));
      doc.registerFont('Poppins', join(FONTS_DIR, 'Poppins-Regular.ttf'));
      doc.registerFont('Poppins-SemiBold', join(FONTS_DIR, 'Poppins-SemiBold.ttf'));

      // Fill background on every new page
      const fillBackground = () => {
        doc.save();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.bg);
        doc.restore();
      };
      doc.on('pageAdded', fillBackground);
      fillBackground();

      // Collect output chunks
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Cover page
      this.writeCover(doc);

      // Menu-style listing: multiple services per page
      if (services.length > 0) {
        doc.addPage();
        this.writeMenuSectionHeader(doc);
        let cursorY = doc.page.margins.top + 44; // below section header

        services.forEach((service, i) => {
          cursorY = this.writeMenuEntry(doc, service, imageBuffers[i] ?? null, cursorY);
        });

        this.writePageNumber(doc, doc.bufferedPageRange().count);
      }

      doc.end();
    });
  }

  // -------------------------------------------------------------------------
  // Page writers
  // -------------------------------------------------------------------------

  private writeCover(doc: InstanceType<typeof PDFDocument>): void {
    const { width, height } = doc.page;
    const margin = doc.page.margins.left;
    const contentWidth = width - margin * 2;
    const midY = height / 2 - 60;

    // Brand name
    doc
      .font('Outfit-Bold')
      .fontSize(48)
      .fillColor(C.highlight)
      .text('OrthoPro Lab', margin, midY, { width: contentWidth, align: 'center' });

    // Tagline
    doc
      .font('Poppins')
      .fontSize(18)
      .fillColor(C.body)
      .text('Laboratorio dental en Medellín', { width: contentWidth, align: 'center' });

    // Address
    doc
      .font('Poppins')
      .fontSize(14)
      .fillColor(C.muted)
      .text('Cl. 53 #43 - 43, oficina 204, Medellín', { width: contentWidth, align: 'center' });

    // Date at the bottom
    const dateStr = new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc
      .font('Poppins')
      .fontSize(12)
      .fillColor(C.muted)
      .text(`Actualizado el ${dateStr}`, margin, height - 80, {
        width: contentWidth,
        align: 'center',
      });

    // Page number for cover
    this.writePageNumber(doc, 1);
  }

  private writeMenuSectionHeader(doc: InstanceType<typeof PDFDocument>): void {
    const margin = doc.page.margins.left;
    const contentWidth = doc.page.width - margin * 2;
    const y = doc.page.margins.top;

    doc
      .font('Outfit-Bold')
      .fontSize(20)
      .fillColor(C.highlight)
      .text('Nuestros Servicios', margin, y, { width: contentWidth });
  }

  /**
   * Draws one menu entry (restaurant-menu style) at the given Y position.
   * Returns the Y position after the entry so the caller can stack entries.
   * Adds a new page automatically when there is not enough room.
   */
  private writeMenuEntry(
    doc: InstanceType<typeof PDFDocument>,
    service: ServicioParaPdf,
    imageBuffer: Buffer | null,
    startY: number,
  ): number {
    const margin = doc.page.margins.left;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - margin * 2;
    const bottomBoundary = pageHeight - doc.page.margins.bottom - 20;

    // Thumbnail dimensions
    const THUMB_W = 90;
    const THUMB_H = 70;
    const THUMB_GAP = 14; // gap between thumbnail and text column

    // Text column
    const textX = imageBuffer ? margin + THUMB_W + THUMB_GAP : margin;
    const textW = imageBuffer ? contentWidth - THUMB_W - THUMB_GAP : contentWidth;

    // Estimate entry height so we can trigger a page break before drawing
    const ENTRY_MIN_H = Math.max(THUMB_H, 72) + 20; // thumb or text block + separator
    if (startY + ENTRY_MIN_H > bottomBoundary) {
      doc.addPage();
      this.writePageNumber(doc, doc.bufferedPageRange().count);
      startY = doc.page.margins.top;
    }

    const entryY = startY;

    // Thumbnail
    if (imageBuffer) {
      try {
        doc.image(imageBuffer, margin, entryY, {
          width: THUMB_W,
          height: THUMB_H,
          cover: [THUMB_W, THUMB_H],
          align: 'center',
          valign: 'center',
        });
      } catch {
        this.logger.warn(`Failed to embed thumbnail for service ${service.id}`);
      }
    }

    // Service name
    doc
      .font('Outfit-Bold')
      .fontSize(13)
      .fillColor(C.title)
      .text(service.nombre, textX, entryY, { width: textW, lineGap: 1 });

    const afterName = doc.y + 4;

    // Description (up to 3 lines, then truncated by pdfkit)
    if (service.descripcion) {
      doc
        .font('Poppins')
        .fontSize(9)
        .fillColor(C.body)
        .text(service.descripcion, textX, afterName, {
          width: textW,
          height: 38, // ~3 lines at 9pt
          ellipsis: true,
          lineGap: 1,
        });
    }

    const afterDesc = Math.max(doc.y, entryY + THUMB_H) + 8;

    // Price row: label on the left, value right-aligned
    const precioStr = this.formatPrecio(service.precio);
    doc
      .font('Poppins-SemiBold')
      .fontSize(10)
      .fillColor(C.highlight)
      .text(precioStr, textX, afterDesc, { width: textW, align: 'right' });

    const afterPrice = doc.y + 14;

    // Separator line
    const sepY = afterPrice;
    doc
      .save()
      .moveTo(margin, sepY)
      .lineTo(margin + contentWidth, sepY)
      .lineWidth(0.4)
      .strokeColor(C.raised)
      .stroke()
      .restore();

    return sepY + 16;
  }

  private writePageNumber(
    doc: InstanceType<typeof PDFDocument>,
    pageNum: number,
  ): void {
    const margin = doc.page.margins.left;
    const contentWidth = doc.page.width - margin * 2;
    const bottomY = doc.page.height - 36;

    doc
      .font('Poppins')
      .fontSize(10)
      .fillColor(C.muted)
      .text(`Página ${pageNum}`, margin, bottomY, {
        width: contentWidth,
        align: 'center',
        lineBreak: false,
      });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Formats a precio string for display; "0.00" / "0" becomes "Consultar valor". */
  formatPrecio(precio: string): string {
    const num = Number(precio);
    if (!num || num === 0) return 'Consultar valor';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num);
  }

  async fetchServiceImage(url: string | null): Promise<Buffer | null> {
    if (!url || !isCloudinaryUrl(url)) return null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), IMAGE_FETCH_TIMEOUT_MS);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const contentLength = Number(res.headers.get('content-length') ?? 0);
      if (contentLength > IMAGE_MAX_BYTES) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > IMAGE_MAX_BYTES) return null;
      return buf;
    } catch {
      return null;
    }
  }
}
