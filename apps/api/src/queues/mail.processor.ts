import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer/index.js';
import { CuentaCobroMailAttachmentsService } from '../cuentas-cobro/cuenta-cobro-mail-attachments.service.js';
import { MAIL_CONCURRENCY, MAIL_JOB, MAIL_QUEUE } from './queues.constants.js';
import type { MailJobPayload } from './mail-queue.service.js';

/**
 * Sends queued email. A delivery failure throws so BullMQ retries with the
 * backoff configured by the producer; exhausted jobs stay in the failed set
 * for inspection instead of disappearing.
 */
@Processor(MAIL_QUEUE, { concurrency: MAIL_CONCURRENCY })
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cuentaCobroAttachments: CuentaCobroMailAttachmentsService,
  ) {
    super();
  }

  async process(job: Job<MailJobPayload>): Promise<{ delivered: number }> {
    if (job.name !== MAIL_JOB) {
      throw new Error(`Unknown mail job "${job.name}"`);
    }

    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      throw new Error('SMTP not configured');
    }
    const port = this.config.get<number>('SMTP_PORT') ?? 587;

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const attachments: Attachment[] = job.data.attachments.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.from(attachment.contentBase64, 'base64'),
    }));
    if (job.data.attachmentSource?.kind === 'cuenta-cobro') {
      // Built here, at send time, from ids: a retry rebuilds them unchanged.
      attachments.push(
        ...(await this.cuentaCobroAttachments.attachmentsFor(
          job.data.attachmentSource.cuentaCobroId,
        )),
      );
    }

    try {
      await transport.sendMail({
        from:
          this.config.get<string>('SMTP_FROM') ??
          'OrthoPro Lab <no-reply@orthoprolab.com>',
        to: job.data.to.join(', '),
        subject: job.data.subject,
        text: job.data.text ?? undefined,
        html: job.data.html ?? undefined,
        attachments,
      });
      this.logger.log(`Mail job ${job.id} delivered: "${job.data.subject}"`);
      return { delivered: job.data.to.length };
    } finally {
      transport.close();
    }
  }
}
