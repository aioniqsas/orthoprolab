import { Injectable } from '@nestjs/common';
import { MailQueueService, type EnviarResult } from '../queues/mail-queue.service.js';

@Injectable()
export class MailerControlTrabajosService {
  constructor(private readonly mailQueue: MailQueueService) {}

  /** Queued: a failed delivery is retried instead of being lost. */
  async sendControlTrabajos(
    to: (string | null | undefined)[] | string,
    pdfBuffer: Buffer,
    ordenId: string,
  ): Promise<EnviarResult> {
    const destinatarios = (Array.isArray(to) ? to : [to]).filter(
      (correo): correo is string => Boolean(correo),
    );
    if (destinatarios.length === 0) {
      return { sent: false, error: 'Sin destinatarios' };
    }

    return this.mailQueue.enqueue({
      to: destinatarios,
      subject: `Control de trabajos de laboratorio - Orden #${ordenId}`,
      text: 'Se adjunta el control de trabajos de laboratorio para la orden finalizada.',
      attachments: [
        {
          filename: 'control-de-trabajos-de-laboratorio.pdf',
          contentBase64: pdfBuffer.toString('base64'),
        },
      ],
    });
  }
}
