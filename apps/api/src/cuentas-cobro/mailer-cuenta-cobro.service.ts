import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { CuentaCobro } from './cuenta-cobro.entity.js';
import type { Pago } from './pago.entity.js';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface EnviarResult {
  sent: boolean;
  error?: string;
}

@Injectable()
export class MailerCuentaCobroService {
  private readonly logger = new Logger(MailerCuentaCobroService.name);

  constructor(private readonly config: ConfigService) {}

  async sendCuentaCobro(
    cuenta: CuentaCobro,
    pdfBuffer: Buffer,
    toEmail: string,
  ): Promise<EnviarResult> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT') ?? 587;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM') ?? 'OrthoPro Lab <no-reply@orthoprolab.com>';

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS');
      return { sent: false, error: 'SMTP not configured' };
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const clinicaNombre = cuenta.clinica?.nombre ?? 'Clínica';
    const total = `$${Number(cuenta.total).toLocaleString('es-CO')}`;
    const vencimiento = cuenta.fechaVencimiento
      ? new Date(cuenta.fechaVencimiento).toLocaleDateString('es-CO')
      : 'Sin vencimiento';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
  h2 { color: #1a1a2e; }
  .info { background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; }
  .total { font-size: 1.5rem; font-weight: bold; color: #1a1a2e; }
  .footer { font-size: 0.8rem; color: #888; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <h2>Cuenta de cobro ${cuenta.numero}</h2>
  <p>Estimado equipo de ${clinicaNombre},</p>
  <p>Se adjunta la cuenta de cobro <strong>${cuenta.numero}</strong> emitida por OrthoPro Lab.</p>
  <div class="info">
    <p><strong>Número:</strong> ${cuenta.numero}</p>
    <p><strong>Fecha de emisión:</strong> ${new Date(cuenta.fechaEmision).toLocaleDateString('es-CO')}</p>
    <p><strong>Fecha de vencimiento:</strong> ${vencimiento}</p>
    <p class="total">Total: ${total}</p>
  </div>
  <p>Por favor, revise el documento adjunto para el detalle completo.</p>
  <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
  <p>Saludos,<br><strong>OrthoPro Lab</strong></p>
  <div class="footer">Este mensaje fue generado automáticamente. Por favor no responda a este correo.</div>
</body>
</html>`;

    try {
      await transport.sendMail({
        from,
        to: toEmail,
        subject: `Cuenta de cobro ${cuenta.numero} — OrthoPro Lab`,
        html,
        attachments: [
          {
            filename: `cuenta_${cuenta.numero.replace(/-/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      return { sent: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email for ${cuenta.numero}: ${msg}`);
      return { sent: false, error: msg };
    }
  }

  /** Notifies administrators that a clinic uploaded a payment receipt. */
  async sendPagoRegistrado(
    cuenta: CuentaCobro,
    pago: Pago,
    toEmails: string[],
  ): Promise<EnviarResult> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT') ?? 587;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from =
      this.config.get<string>('SMTP_FROM') ??
      'OrthoPro Lab <no-reply@orthoprolab.com>';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS',
      );
      return { sent: false, error: 'SMTP not configured' };
    }
    if (toEmails.length === 0) {
      this.logger.warn('No active administrators to notify about a payment');
      return { sent: false, error: 'No active administrators' };
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const adminUrl = this.config.get<string>('ADMIN_URL') ?? 'http://localhost:3002';
    const clinicaNombre = cuenta.clinica?.nombre ?? 'Clínica';
    const total = `$${Number(pago.monto).toLocaleString('es-CO')}`;
    const fecha = new Date(pago.fechaPago).toLocaleDateString('es-CO');
    const comprobante = pago.comprobanteUrl
      ? `<p><a href="${escapeHtml(pago.comprobanteUrl)}">Ver comprobante</a></p>`
      : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
  h2 { color: #1a1a2e; }
  .info { background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; }
  .total { font-size: 1.5rem; font-weight: bold; color: #1a1a2e; }
  .footer { font-size: 0.8rem; color: #888; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <h2>Pago registrado — ${escapeHtml(cuenta.numero)}</h2>
  <p><strong>${escapeHtml(clinicaNombre)}</strong> subió un comprobante de pago desde el portal de clientes.</p>
  <div class="info">
    <p><strong>Cuenta de cobro:</strong> ${escapeHtml(cuenta.numero)}</p>
    <p><strong>Clínica:</strong> ${escapeHtml(clinicaNombre)}</p>
    <p><strong>Monto:</strong> ${total}</p>
    <p><strong>Fecha de pago:</strong> ${fecha}</p>
    ${pago.referencia ? `<p><strong>Referencia:</strong> ${escapeHtml(pago.referencia)}</p>` : ''}
    ${pago.notas ? `<p><strong>Notas:</strong> ${escapeHtml(pago.notas)}</p>` : ''}
    ${comprobante}
  </div>
  <p><a href="${escapeHtml(`${adminUrl}/cuentas-cobro/${cuenta.id}`)}">Revisar la cuenta en el panel administrativo</a></p>
  <p>El pago queda registrado; verifícalo contra el extracto bancario antes de darlo por confirmado.</p>
  <div class="footer">Este mensaje fue generado automáticamente. Por favor no responda a este correo.</div>
</body>
</html>`;

    try {
      await transport.sendMail({
        from,
        to: toEmails.join(', '),
        subject: `Pago registrado — ${cuenta.numero} — ${clinicaNombre}`,
        html,
      });
      return { sent: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to notify administrators about payment ${pago.id}: ${msg}`,
      );
      return { sent: false, error: msg };
    }
  }
}
