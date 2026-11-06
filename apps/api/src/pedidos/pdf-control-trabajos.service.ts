import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PDFDocument from 'pdfkit';
import { odontogramaPng } from './odontograma-png.js';
import { odontogramaSvg } from './odontograma-svg.js';
import type { Orden } from './orden.entity.js';

interface DeepDetalle {
  servicio?: string;
  cantidad?: number;
  dientes?: number[];
  colorDiente?: string | null;
}

interface DeepHistorial {
  estadoAnterior?: { codigo?: string; nombre?: string } | null;
  estadoNuevo?: { codigo?: string; nombre?: string } | null;
  fechaCambio?: string;
  observaciones?: string | null;
}

interface DeepOrden {
  fechaCreacion?: Date | string;
  asignacion?: {
    doctor?: { nombres?: string; apellidos?: string };
    paciente?: { nombre?: string; cedula?: string | null };
  };
  detalles?: DeepDetalle[];
  historial?: DeepHistorial[];
}

const COLOR_TEXTO = '#333333';
const COLOR_TITULO = '#000000';
const COLOR_SUAVE = '#555555';
const COLOR_LINEA = '#cccccc';

@Injectable()
export class PdfControlTrabajosService {
  private readonly logger = new Logger(PdfControlTrabajosService.name);

  async generate(orden: Orden): Promise<Buffer> {
    const o = orden as unknown as DeepOrden;
    const pacienteNombre = o.asignacion?.paciente?.nombre ?? '—';
    const pacienteCedula = o.asignacion?.paciente?.cedula ?? '—';
    const doctorNombre = o.asignacion?.doctor
      ? `${o.asignacion.doctor.nombres ?? ''} ${o.asignacion.doctor.apellidos ?? ''}`.trim()
      : '—';

    const detalles = (o.detalles ?? []).map((d) => ({
      servicio: d.servicio?.trim() || 'Sin clase',
      cantidad: d.cantidad ?? 1,
      dientes: d.dientes ?? [],
      color: d.colorDiente ?? null,
    }));

    const dientesOrden = [...new Set(detalles.flatMap((d) => d.dientes))];

    const devoluciones = (o.historial ?? []).filter(
      (h) => h.estadoNuevo?.codigo === 'devuelta_correccion' && (h.observaciones ?? '').trim() !== '',
    );

    const odontograma = await odontogramaPng(odontogramaSvg({ dientes: dientesOrden }));

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: { Title: 'Control de trabajos de laboratorio', Author: 'OrthoPro Lab' },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const M = 50;
      const W = doc.page.width - M * 2;
      const limiteInferior = doc.page.height - 60;

      doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR_TITULO).text('OrthoPro Lab', M, M, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(14).text('CONTROL DE TRABAJOS DE LABORATORIO', M, M, { width: W, align: 'right', lineBreak: false });

      const ruleY = M + 28;
      doc.moveTo(M, ruleY).lineTo(M + W, ruleY).lineWidth(0.5).strokeColor(COLOR_LINEA).stroke();

      let y = ruleY + 14;
      const line = (label: string, value: string) => {
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_TITULO).text(label, M, y, { continued: true });
        doc.font('Helvetica').text(` ${value}`);
        y = doc.y + 4;
      };
      const rule = () => {
        doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(COLOR_LINEA).stroke();
        y += 12;
      };

      const fechaStr = o.fechaCreacion
        ? format(new Date(o.fechaCreacion), "d 'de' MMMM 'de' yyyy", { locale: es })
        : format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

      line('Fecha:', fechaStr);
      line('Paciente:', pacienteNombre);
      line('Cédula:', pacienteCedula);
      line('Odontólogo:', doctorNombre);
      line('Laboratorio:', 'OrthoPro Lab');

      y += 8;
      rule();

      // 1. Clases de trabajo, una sola vez y con su detalle por línea.
      doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR_TITULO).text('Clases de trabajo', M, y);
      y = doc.y + 6;

      if (detalles.length === 0) {
        doc.font('Helvetica').fontSize(11).fillColor(COLOR_SUAVE).text('Sin clases de trabajo registradas.', M, y);
        y = doc.y + 10;
      } else {
        detalles.forEach((d) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor(COLOR_TITULO)
            .text(`${d.servicio} × ${d.cantidad}`, M, y);
          y = doc.y + 2;
          const dientes = d.dientes.length > 0 ? `Dientes: ${d.dientes.join(', ')}` : 'Dientes: —';
          const color = d.color ? `Color: ${d.color}` : 'Color: —';
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(COLOR_TEXTO)
            .text(`${dientes} · ${color}`, M + 12, y, { width: W - 12 });
          y = doc.y + 6;
        });
      }

      // 2. Odontograma de la orden (PNG).
      if (odontograma) {
        const anchoImagen = Math.min(W, 430);
        const altoImagen = (anchoImagen * 420) / 600;
        if (y + altoImagen > limiteInferior) {
          doc.addPage();
          y = M;
        }
        doc.image(odontograma, M + (W - anchoImagen) / 2, y, { width: anchoImagen });
        y += altoImagen + 14;
      }

      if (y > limiteInferior) {
        doc.addPage();
        y = M;
      }
      rule();

      // 3. Pruebas / devoluciones, al final, con su fecha.
      doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR_TITULO).text('Pruebas / Devoluciones', M, y);
      y = doc.y + 6;

      if (devoluciones.length === 0) {
        doc.font('Helvetica').fontSize(11).fillColor(COLOR_SUAVE).text('Sin devoluciones registradas.', M, y);
      } else {
        devoluciones.forEach((h, idx) => {
          const fecha = h.fechaCambio
            ? format(new Date(h.fechaCambio), "d 'de' MMMM 'de' yyyy", { locale: es })
            : 'Sin fecha';
          if (y > limiteInferior) {
            doc.addPage();
            y = M;
          }
          doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor(COLOR_TITULO)
            .text(`Prueba ${idx + 1} — ${fecha}`, M, y);
          y = doc.y + 2;
          doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor(COLOR_TEXTO)
            .text(h.observaciones ?? '', M + 12, y, { width: W - 12 });
          y = doc.y + 8;
        });
      }

      doc.end();
    });
  }
}
