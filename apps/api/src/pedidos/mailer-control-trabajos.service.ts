import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

export interface EnviarResult { sent: boolean; error?: string; }

@Injectable()
export class MailerControlTrabajosService {
  private readonly logger = new Logger(MailerControlTrabajosService.name);
  constructor(private readonly config: ConfigService) {}

  async sendControlTrabajos(to: string[], pdfBuffer: Buffer, ordenId: string): Promise<EnviarResult> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT') ?? 587;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM') ?? 'OrthoPro Lab <no-reply@orthoprolab.com>';

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured');
      return { sent: false, error: 'SMTP not configured' };
    }

    const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

    try {
      await transport.sendMail({
        from,
        to: to.join(', '),
        subject: `Control de trabajos de laboratorio - Orden #${ordenId}`,
        text: 'Se adjunta el control de trabajos de laboratorio para la orden finalizada.',
        attachments: [{ filename: 'control-de-trabajos-de-laboratorio.pdf', content: pdfBuffer }],
      });
      return { sent: true };
    } catch (err) {
      this.logger.error(`Failed to send email: ${err}`);
      return { sent: false, error: String(err) };
    }
  }
}
