import { createHash } from 'node:crypto';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import type { CloudinarySdk } from '../catalogo/cloudinary-image-storage.js';
import type { EnvConfig } from '../config/env.validation.js';
import type { CuentaCobro } from './cuenta-cobro.entity.js';

// Currency formatter for COP locale (no external deps)
function fmt(val: string | number): string {
  return `$${Number(val).toLocaleString('es-CO')}`;
}

interface DeepDetalle {
  servicio?: { nombre?: string };
  cantidad?: number;
}

interface DeepOrden {
  id?: string | number;
  detalles?: DeepDetalle[];
  asignacion?: {
    paciente?: { nombre?: string };
    doctor?: { nombres?: string; apellidos?: string };
  };
}

@Injectable()
export class PdfCuentaCobroService {
  private readonly logger = new Logger(PdfCuentaCobroService.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  /** Generates a billing account PDF using PDFKit built-in Helvetica fonts. */
  async generate(cuenta: CuentaCobro): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Cuenta de cobro ${cuenta.numero}`,
          Author: 'OrthoPro Lab',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const M = 50;
      const W = doc.page.width - M * 2;

      // ── Header ────────────────────────────────────────────────────────────────
      const hY = M;
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#000000')
        .text('OrthoPro Lab', M, hY, { lineBreak: false });
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#000000')
        .text('CUENTA DE COBRO', M, hY, { width: W, align: 'right', lineBreak: false });

      const ruleY = hY + 28;
      doc
        .moveTo(M, ruleY)
        .lineTo(M + W, ruleY)
        .lineWidth(0.5)
        .strokeColor('#cccccc')
        .stroke();

      // ── Billing info ──────────────────────────────────────────────────────────
      const infoY = ruleY + 14;
      const colW = Math.floor(W / 2);
      const lh = 16;

      const fechaEmision = cuenta.fechaEmision
        ? format(cuenta.fechaEmision, "d 'de' MMMM 'de' yyyy", { locale: es })
        : '—';
      const fechaVencimiento = cuenta.fechaVencimiento
        ? format(cuenta.fechaVencimiento, "d 'de' MMMM 'de' yyyy", { locale: es })
        : 'Sin vencimiento';
      const clinicaNombre = cuenta.clinica?.nombre ?? '—';
      const clinicaCorreo = cuenta.clinica?.correo ?? '—';

      // Left column: billing identifiers
      doc.font('Helvetica').fontSize(10).fillColor('#333333');
      doc.text(`Número: ${cuenta.numero}`, M, infoY, { width: colW, lineBreak: false });
      doc.text(`Fecha emisión: ${fechaEmision}`, M, infoY + lh, { width: colW, lineBreak: false });
      doc.text(`Fecha vencimiento: ${fechaVencimiento}`, M, infoY + lh * 2, {
        width: colW,
        lineBreak: false,
      });
      doc.text(`Clínica: ${clinicaNombre}`, M, infoY + lh * 3, { width: colW, lineBreak: false });
      doc.text(`Correo: ${clinicaCorreo}`, M, infoY + lh * 4, { width: colW, lineBreak: false });

      // ── Orders table ──────────────────────────────────────────────────────────
      const tableY = infoY + lh * 5 + 18;
      // Column widths: #, Orden, Paciente, Doctor, Servicios (wide), Total
      const patientColW = Math.round(W * 0.18);
      const doctorColW = Math.round(W * 0.18);
      const totalColW = 70;
      const numColW = 22;
      const ordenColW = 44;
      const svcColW = W - numColW - ordenColW - patientColW - doctorColW - totalColW;
      const cw = [numColW, ordenColW, patientColW, doctorColW, svcColW, totalColW] as const;
      const hdrs = ['#', 'Orden', 'Paciente', 'Doctor', 'Servicios', 'Total'] as const;

      // Header row (gray background)
      doc.rect(M, tableY, W, 18).fill('#e0e0e0');
      let xo = M;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
      hdrs.forEach((h, i) => {
        const align = i === hdrs.length - 1 ? 'right' : 'left';
        doc.text(h, xo + 4, tableY + 4, { width: cw[i] - 8, lineBreak: false, align });
        xo += cw[i];
      });

      // Data rows (dynamic height — one line per service item)
      let rowY = tableY + 18;
      const ordenes = cuenta.ordenes ?? [];
      const SVC_LINE_H = 13;
      const ROW_PAD = 4;

      ordenes.forEach((co, idx) => {
        const ord = co.orden as unknown as DeepOrden | undefined;
        const patient = ord?.asignacion?.paciente?.nombre ?? '—';
        const doctorOrd = ord?.asignacion?.doctor;
        const doctorLabel = doctorOrd
          ? `${doctorOrd.nombres ?? ''} ${doctorOrd.apellidos ?? ''}`.trim()
          : '';
        const svcItems = (ord?.detalles ?? []).map(
          (d) => `${d.servicio?.nombre ?? '?'} × ${d.cantidad ?? 1}`,
        );
        const valor = fmt(co.valorSnapshot);

        const rowH = Math.max(18, ROW_PAD * 2 + Math.max(1, svcItems.length) * SVC_LINE_H);

        doc.rect(M, rowY, W, rowH).fill(idx % 2 === 0 ? '#ffffff' : '#f9f9f9');
        doc.font('Helvetica').fontSize(9).fillColor('#333333');

        // Vertically centered y for single-line cells
        const vY = rowY + (rowH - 9) / 2;

        xo = M;
        doc.text(String(idx + 1), xo + 4, vY, { width: cw[0] - 8, lineBreak: false });
        xo += cw[0];
        doc.text(String(ord?.id ?? ''), xo + 4, vY, { width: cw[1] - 8, lineBreak: false });
        xo += cw[1];
        // Paciente
        doc.text(patient, xo + 4, vY, { width: cw[2] - 8, lineBreak: false, ellipsis: true });
        xo += cw[2];

        // Doctor
        doc.text(doctorLabel || '—', xo + 4, vY, { width: cw[3] - 8, lineBreak: false, ellipsis: true });
        xo += cw[3];

        // Servicios: stacked lines
        const svcX = xo;
        if (svcItems.length === 0) {
          doc.text('—', svcX + 4, rowY + ROW_PAD, { width: cw[4] - 8, lineBreak: false });
        } else {
          svcItems.forEach((line, li) => {
            doc.text(line, svcX + 4, rowY + ROW_PAD + li * SVC_LINE_H, {
              width: cw[4] - 8,
              lineBreak: false,
              ellipsis: true,
            });
          });
        }
        xo += cw[4];

        doc.text(valor, xo + 4, vY, { width: cw[5] - 8, align: 'right', lineBreak: false });

        rowY += rowH;
      });

      // Footer total row
      doc.rect(M, rowY, W, 18).fill('#e0e0e0');
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#000000')
        .text(`Total: ${fmt(cuenta.total)}`, M + 4, rowY + 4, {
          width: W - 8,
          align: 'right',
          lineBreak: false,
        });
      rowY += 18;

      // ── Payments summary ──────────────────────────────────────────────────────
      const activePagos = (cuenta.pagos ?? []).filter((p) => !p.anulado);
      if (activePagos.length > 0) {
        rowY += 16;
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#000000')
          .text('Pagos registrados', M, rowY, { lineBreak: false });
        rowY += 18;

        const pRefColW = W - 120 - 100 - 90;
        const pcw = [120, 100, pRefColW, 90] as const;
        const phdrs = ['Fecha', 'Método', 'Referencia', 'Monto'] as const;

        doc.rect(M, rowY, W, 18).fill('#e0e0e0');
        xo = M;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
        phdrs.forEach((h, i) => {
          doc.text(h, xo + 4, rowY + 4, { width: pcw[i] - 8, lineBreak: false });
          xo += pcw[i];
        });
        rowY += 18;

        activePagos.forEach((p, idx) => {
          const fecha = p.fechaPago
            ? format(p.fechaPago, "d 'de' MMMM 'de' yyyy", { locale: es })
            : '—';
          doc.rect(M, rowY, W, 16).fill(idx % 2 === 0 ? '#ffffff' : '#f9f9f9');
          xo = M;
          doc.font('Helvetica').fontSize(9).fillColor('#333333');
          [fecha, p.metodo, p.referencia ?? '—', fmt(p.monto)].forEach((cell, i) => {
            doc.text(cell, xo + 4, rowY + 3, { width: pcw[i] - 8, lineBreak: false, ellipsis: true });
            xo += pcw[i];
          });
          rowY += 16;
        });

        const totalPagado = activePagos.reduce((s, p) => s + Number(p.monto), 0);
        const saldo = Number(cuenta.total) - totalPagado;
        rowY += 8;
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#000000')
          .text(`Saldo pendiente: ${fmt(saldo)}`, M + 4, rowY, {
            width: W - 8,
            align: 'right',
            lineBreak: false,
          });
      }

      // ── Footer ────────────────────────────────────────────────────────────────
      const footerY = doc.page.height - 36;
      const dateStr = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#999999')
        .text(`Generado por OrthoPro Lab — ${dateStr}`, M, footerY, {
          width: W,
          align: 'center',
          lineBreak: false,
        });

      doc.end();
    });
  }

  /**
   * Uploads a PDF buffer to Cloudinary under `orthopro/cuentas/<public_id>.pdf`.
   * Returns the secure URL and a SHA-256 hash of the buffer content.
   *
   * Throws ServiceUnavailableException when Cloudinary credentials are absent.
   */
  async uploadToCloudinary(
    buffer: Buffer,
    cuentaNumero: string,
  ): Promise<{ url: string; hash: string }> {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('PDF storage not configured.');
    }

    const sdk = cloudinary as unknown as CloudinarySdk;
    sdk.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const publicId = cuentaNumero.replace(/-/g, '_');
    const hash = createHash('sha256').update(buffer).digest('hex');

    const url = await new Promise<string>((resolve, reject) => {
      const stream = sdk.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'orthopro/cuentas',
          public_id: publicId,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary PDF upload failed (${error.name})`);
            return reject(new Error('PDF upload failed'));
          }
          const secureUrl = result?.secure_url;
          if (!secureUrl) {
            this.logger.error('Cloudinary returned an unexpected response for PDF');
            return reject(new Error('Unexpected storage response'));
          }
          resolve(secureUrl);
        },
      );
      stream.on('error', () => reject(new Error('PDF upload stream error')));
      stream.end(buffer);
    });

    return { url, hash };
  }
}
