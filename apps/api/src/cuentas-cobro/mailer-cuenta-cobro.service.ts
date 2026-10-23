/**
 * Mailer service for billing accounts.
 *
 * nodemailer is NOT installed. To enable email, run:
 *   bun add nodemailer @types/nodemailer
 * Then replace this stub with a full nodemailer transport using env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Example email body (inline HTML, no external template engine needed):
 *   <h2>Cuenta de cobro {{numero}}</h2>
 *   <p>Estimado Dr. {{doctorNombre}},</p>
 *   <p>Se adjunta la cuenta de cobro {{numero}} por un valor de ${{total}}.</p>
 *   <p>Fecha de vencimiento: {{fechaVencimiento}}</p>
 *   <p>Saludos,<br>OrthoPro Lab</p>
 *
 * Attach the PDF with:
 *   attachments: [{ filename: `cuenta_${numero}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
 */
import { Injectable, Logger } from '@nestjs/common';
import type { CuentaCobro } from './cuenta-cobro.entity.js';

export interface EnviarResult {
  sent: boolean;
  error?: string;
}

@Injectable()
export class MailerCuentaCobroService {
  private readonly logger = new Logger(MailerCuentaCobroService.name);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendCuentaCobro(
    _cuenta: CuentaCobro,
    _pdfBuffer: Buffer,
    toEmail: string,
  ): Promise<EnviarResult> {
    this.logger.warn(
      `Email not sent to ${toEmail}: nodemailer is not installed. ` +
        'Run: bun add nodemailer @types/nodemailer',
    );
    return { sent: false, error: 'nodemailer not installed' };
  }
}
