import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { Orden } from '../pedidos/orden.entity.js';
import { PdfControlTrabajosService } from '../pedidos/pdf-control-trabajos.service.js';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { CuentaCobroOrden } from './cuenta-cobro-orden.entity.js';
import { PdfCuentaCobroService } from './pdf-cuenta-cobro.service.js';

/** One file of the billing-account email. */
export interface CuentaCobroAttachment {
  filename: string;
  content: Buffer;
  contentType: 'application/pdf';
}

/**
 * Builds the attachments of the billing-account email from the account id.
 *
 * S3: the queued job carries ids, never PDF bytes. The account PDF lives in
 * Cloudinary (its URL is stored in the row), and the control PDFs are generated
 * here, one at a time, when the mail worker sends the message — so a retry
 * rebuilds the same files from the database and Redis keeps no base64.
 */
@Injectable()
export class CuentaCobroMailAttachmentsService {
  private readonly logger = new Logger(CuentaCobroMailAttachmentsService.name);

  constructor(
    @InjectRepository(CuentaCobro)
    private readonly cuentaCobroRepo: Repository<CuentaCobro>,
    @InjectRepository(CuentaCobroOrden)
    private readonly cuentaCobroOrdenRepo: Repository<CuentaCobroOrden>,
    @InjectRepository(Orden)
    private readonly ordenRepo: Repository<Orden>,
    private readonly pdfCuenta: PdfCuentaCobroService,
    private readonly pdfControlTrabajos: PdfControlTrabajosService,
  ) {}

  async attachmentsFor(cuentaId: string): Promise<CuentaCobroAttachment[]> {
    const cuenta = await this.cuentaCobroRepo.findOne({
      where: { id: cuentaId },
      relations: { clinica: true },
    });
    if (!cuenta) {
      throw new NotFoundException(`Cuenta de cobro ${cuentaId} no encontrada.`);
    }

    const attachments: CuentaCobroAttachment[] = [
      {
        filename: `cuenta_${cuenta.numero.replace(/-/g, '_')}.pdf`,
        content: await this.cuentaPdf(cuenta),
        contentType: 'application/pdf',
      },
    ];

    // Cada orden incluida viaja con su control de trabajos: la clínica recibe
    // en un solo correo la cuenta y el respaldo del trabajo cobrado.
    const adjuntas = await this.cuentaCobroOrdenRepo.find({
      where: { cuentaCobroId: cuenta.id },
    });
    if (adjuntas.length === 0) return attachments;

    const ordenes = await this.ordenRepo.find({
      where: { id: In(adjuntas.map((a) => a.ordenId)) },
      relations: {
        estado: true,
        asignacion: { doctor: true, paciente: true },
        detalles: true,
        historial: { estadoNuevo: true },
      },
      order: { id: 'ASC' },
    });

    // One PDF at a time: the six controls are never held as base64 at once.
    for (const orden of ordenes) {
      try {
        attachments.push({
          filename: `control-de-trabajos-orden-${orden.id}.pdf`,
          content: await this.pdfControlTrabajos.generate(orden),
          contentType: 'application/pdf',
        });
      } catch (err) {
        // Un control que falla no debe impedir el envío de la cuenta.
        this.logger.warn(
          `Control de trabajos omitido para la orden ${orden.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return attachments;
  }

  /** Stored PDF from Cloudinary; generated in place when the row has none. */
  private async cuentaPdf(cuenta: CuentaCobro): Promise<Buffer> {
    if (!cuenta.pdfUrl) return this.pdfCuenta.generate(cuenta);
    const res = await fetch(cuenta.pdfUrl);
    if (!res.ok) {
      throw new Error(
        `Could not fetch the account PDF (${res.status}) for ${cuenta.numero}`,
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
