import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PDFDocument from 'pdfkit';
import type { Orden } from './orden.entity.js';

interface DeepDetalle {
  servicio?: string;
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
    const tiposTrabajo =
      (o.detalles ?? [])
        .map((d) => {
          const nombre = d.servicio;
          if (!nombre) return null;
          const dientes = (d.dientes ?? []).join(', ');
          const color = d.colorDiente ? ` (${d.colorDiente})` : '';
          return dientes ? `${nombre} — ${dientes}${color}` : nombre;
        })
        .filter(Boolean)
        .join('; ') || '—';

    const devoluciones = (o.historial ?? []).filter(
      (h) => h.estadoNuevo?.codigo === 'devuelta_correccion' && (h.observaciones ?? '').trim() !== '',
    );

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

      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text('OrthoPro Lab', M, M, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(14).text('CONTROL DE TRABAJOS DE LABORATORIO', M, M, { width: W, align: 'right', lineBreak: false });

      const ruleY = M + 28;
      doc.moveTo(M, ruleY).lineTo(M + W, ruleY).lineWidth(0.5).strokeColor('#cccccc').stroke();

      let y = ruleY + 14;
      const line = (label: string, value: string) => {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text(label, M, y, { continued: true });
        doc.font('Helvetica').text(` ${value}`);
        y = doc.y + 4;
      };

      const fechaStr = o.fechaCreacion
        ? format(new Date(o.fechaCreacion), "d 'de' MMMM 'de' yyyy", { locale: es })
        : format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

      line('Fecha:', fechaStr);
      line('Paciente:', pacienteNombre);
      line('Cédula:', pacienteCedula);
      line('Odontólogo:', doctorNombre);
      line('Laboratorio:', 'OrthoPro Lab');
      line('Clase de trabajo:', tiposTrabajo);

      y += 8;
      doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor('#cccccc').stroke();
      y += 12;

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text('Pruebas / Devoluciones', M, y);
      y = doc.y + 6;

      if (devoluciones.length === 0) {
        doc.font('Helvetica').fontSize(11).fillColor('#555').text('Sin devoluciones registradas.', M, y);
      } else {
        devoluciones.forEach((h, idx) => {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text(`Prueba ${idx + 1}`, M, y);
          y = doc.y + 2;
          doc.font('Helvetica').fontSize(11).fillColor('#333').text(h.observaciones ?? '', M + 12, y, { width: W - 12 });
          y = doc.y + 8;
        });
      }

      doc.end();
    });
  }
}
