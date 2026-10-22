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

// Bump the suffix whenever the layout changes: the key only fingerprints the
// catalog state, so a deploy would otherwise keep serving the cached old PDF.
const CACHE_KEY = 'orthopro:pdf:catalog:v3';
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

// Timeline geometry (points)
const SIDE_GAP = 22; // spine → card inner edge
const CARD_PAD = 14;
const CARD_RADIUS = 10;
const ITEM_GAP = 10; // extra space between consecutive cards
// Each card starts before the previous one ends: sides alternate, so the step
// overlap is what turns the list into a staircase instead of a wide column.
const NEXT_STEP_RATIO = 0.58; // share of the card height the next card skips
const IMG_H = 78;
const DOT_OFFSET = 18; // dot Y, measured from the card top

// Timeline typography
const NAME_SIZE = 12.5;
const DESC_SIZE = 8.5;
const PRICE_SIZE = 10;
const PRICE_H = 14;
const MAX_DESC_LINES = 4;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // Y of the last dot drawn, used to connect the spine between cards. Reset on
  // every page break. Generation is synchronous once the images are fetched.
  private timelinePrevDotY: number | null = null;

  // Layout cursors: the last card drawn, and the bottom of each column. The
  // step keeps the staircase tight; the columns keep two cards on the same
  // side from touching when their heights differ a lot.
  private timelineLastTop: number | null = null;
  private timelineLastH = 0;
  private timelineColumnBottom: [number, number] = [0, 0];

  // True once the first card was drawn: after a page break the spine gets a
  // short stub from the top edge, but the very first card starts it instead.
  private timelineDrawn = false;

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
        // Page numbers are stamped after the content, once every page exists.
        bufferPages: true,
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

      // Timeline: one centered spine, cards alternating left/right.
      if (services.length > 0) {
        doc.addPage();
        this.timelinePrevDotY = null;
        this.timelineDrawn = false;
        this.timelineLastTop = null;
        this.timelineLastH = 0;
        this.timelineColumnBottom = [0, 0];
        let cursorY = this.writeSectionHeader(doc);

        services.forEach((service, i) => {
          cursorY = this.writeTimelineEntry(
            doc,
            service,
            imageBuffers[i] ?? null,
            i,
            cursorY,
          );
        });
      }

      // Stamp the page number on every page, cover included.
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        this.writePageNumber(doc, i + 1);
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
  }

  /** Draws the "Nuestros Servicios" header and returns the Y for the first card. */
  private writeSectionHeader(doc: InstanceType<typeof PDFDocument>): number {
    const margin = doc.page.margins.left;
    const contentWidth = doc.page.width - margin * 2;
    const y = doc.page.margins.top;

    doc
      .font('Outfit-Bold')
      .fontSize(20)
      .fillColor(C.highlight)
      .text('Nuestros Servicios', margin, y, { width: contentWidth });

    return doc.y + 26;
  }

  /**
   * Draws one timeline card at `cardTop`, alternating sides around the spine.
   * Returns the Y where the next card may start. Adds a page automatically when
   * the card does not fit.
   */
  private writeTimelineEntry(
    doc: InstanceType<typeof PDFDocument>,
    service: ServicioParaPdf,
    imageBuffer: Buffer | null,
    index: number,
    cardTop: number,
  ): number {
    const margin = doc.page.margins.left;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - margin * 2;
    const cardW = (contentWidth - SIDE_GAP * 2) / 2;
    const innerW = cardW - CARD_PAD * 2;
    const isLeft = index % 2 === 0;
    const cardX = isLeft ? margin : pageWidth - margin - cardW;
    const bottomBoundary = doc.page.height - doc.page.margins.bottom - 20;

    // Measure first: pdfkit's text calls move doc.y, so every Y below is absolute.
    doc.font('Outfit-Bold').fontSize(NAME_SIZE);
    const nameH = doc.heightOfString(service.nombre, {
      width: innerW,
      lineGap: 1,
    });

    doc.font('Poppins').fontSize(DESC_SIZE);
    const lineH = doc.currentLineHeight(true) + 1; // + lineGap: 1
    let descH = service.descripcion
      ? doc.heightOfString(service.descripcion, { width: innerW, lineGap: 1 })
      : 0;

    const imageH = imageBuffer ? IMG_H + 10 : 0;
    const gapBeforePrice = descH > 0 ? 10 : 0;
    const fixedH = CARD_PAD * 2 + imageH + nameH + 6 + gapBeforePrice + PRICE_H;

    // Clamp the description so a single card can never outgrow a full page.
    const pageSpace = bottomBoundary - (doc.page.margins.top + 6);
    const maxDescH = Math.max(
      lineH,
      Math.min(lineH * MAX_DESC_LINES, pageSpace - fixedH),
    );
    descH = Math.min(descH, maxDescH);

    const cardH = fixedH + descH;
    const side = index % 2;

    // Staircase step: start the card before the previous one ends, but never
    // inside a card from the same column.
    const stepTop =
      this.timelineLastTop === null
        ? cardTop
        : this.timelineLastTop + this.timelineLastH * NEXT_STEP_RATIO + ITEM_GAP;
    cardTop = Math.max(cardTop, stepTop, this.timelineColumnBottom[side]);

    if (cardTop + cardH > bottomBoundary) {
      doc.addPage();
      this.timelinePrevDotY = null;
      this.timelineLastTop = null;
      this.timelineLastH = 0;
      this.timelineColumnBottom = [0, 0];
      cardTop = doc.page.margins.top + 6;
    }

    const spineX = pageWidth / 2;
    const dotY = cardTop + DOT_OFFSET;
    const innerX = isLeft ? cardX + cardW : cardX;

    // Spine + connector, behind the card.
    doc.save();
    doc.opacity(0.35).lineWidth(1).strokeColor(C.muted);
    if (this.timelinePrevDotY !== null) {
      doc.moveTo(spineX, this.timelinePrevDotY).lineTo(spineX, dotY).stroke();
    } else if (this.timelineDrawn) {
      // Continuation of the spine after a page break.
      doc
        .moveTo(spineX, doc.page.margins.top - 6)
        .lineTo(spineX, dotY)
        .stroke();
    }
    doc.moveTo(spineX, dotY).lineTo(innerX, dotY).stroke();
    doc.restore();

    // Card
    doc.save();
    doc.roundedRect(cardX, cardTop, cardW, cardH, CARD_RADIUS).fill(C.raised);
    doc.restore();

    let textY = cardTop + CARD_PAD;

    if (imageBuffer) {
      try {
        // pdfkit's `cover` ignores width/height and does not clip, so clip the
        // box ourselves to keep the image inside the card.
        doc.save();
        doc.rect(cardX + CARD_PAD, textY, innerW, IMG_H).clip();
        doc.image(imageBuffer, cardX + CARD_PAD, textY, {
          cover: [innerW, IMG_H],
          align: 'center',
          valign: 'center',
        });
        doc.restore();
      } catch {
        this.logger.warn(`Failed to embed thumbnail for service ${service.id}`);
      }
      textY += IMG_H + 10;
    }

    doc
      .font('Outfit-Bold')
      .fontSize(NAME_SIZE)
      .fillColor(C.title)
      .text(service.nombre, cardX + CARD_PAD, textY, {
        width: innerW,
        lineGap: 1,
      });

    if (descH > 0 && service.descripcion) {
      doc
        .font('Poppins')
        .fontSize(DESC_SIZE)
        .fillColor(C.body)
        .text(service.descripcion, cardX + CARD_PAD, textY + nameH + 6, {
          width: innerW,
          height: descH,
          ellipsis: true,
          lineGap: 1,
        });
    }

    doc
      .font('Poppins-SemiBold')
      .fontSize(PRICE_SIZE)
      .fillColor(C.highlight)
      .text(
        this.formatPrecio(service.precio),
        cardX + CARD_PAD,
        textY + nameH + 6 + descH + gapBeforePrice,
        { width: innerW, align: 'right' },
      );

    // Dot on the spine, above the card edge.
    doc.save();
    doc.circle(spineX, dotY, 7).fill(C.raised);
    doc.circle(spineX, dotY, 3.2).fill(C.highlight);
    doc.restore();

    this.timelinePrevDotY = dotY;
    this.timelineDrawn = true;
    this.timelineLastTop = cardTop;
    this.timelineLastH = cardH;
    this.timelineColumnBottom[side] = cardTop + cardH + ITEM_GAP;
    return cardTop + cardH * NEXT_STEP_RATIO + ITEM_GAP;
  }

  private writePageNumber(
    doc: InstanceType<typeof PDFDocument>,
    pageNum: number,
  ): void {
    const margin = doc.page.margins.left;
    const contentWidth = doc.page.width - margin * 2;
    const bottomY = doc.page.height - 36;

    // The footer sits inside the bottom margin. Zeroing it while drawing keeps
    // pdfkit's text flow from treating the footer as overflowing and adding a
    // blank page.
    const { bottom } = doc.page.margins;
    doc.page.margins.bottom = 0;

    doc
      .font('Poppins')
      .fontSize(10)
      .fillColor(C.muted)
      .text(`Página ${pageNum}`, margin, bottomY, {
        width: contentWidth,
        align: 'center',
        lineBreak: false,
      });

    doc.page.margins.bottom = bottom;
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
