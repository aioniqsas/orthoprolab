import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { MAIL_JOB, MAIL_QUEUE } from './queues.constants.js';

export interface EnviarResult {
  sent: boolean;
  error?: string;
}

export interface MailAttachment {
  filename: string;
  contentBase64: string;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}

export interface MailJobPayload {
  to: string[];
  subject: string;
  text: string | null;
  html: string | null;
  attachments: MailAttachment[];
}

/**
 * Every outgoing email goes through the queue: a failed send is retried with
 * exponential backoff instead of being lost. The worker (MailProcessor) owns
 * the SMTP transport, so producers only describe the message.
 */
@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async enqueue(mail: MailMessage): Promise<EnviarResult> {
    if (!this.smtpConfigured()) {
      this.logger.warn(`SMTP not configured; skipped "${mail.subject}"`);
      return { sent: false, error: 'SMTP not configured' };
    }

    const payload: MailJobPayload = {
      to: (Array.isArray(mail.to) ? mail.to : [mail.to]).filter(Boolean),
      subject: mail.subject,
      text: mail.text ?? null,
      html: mail.html ?? null,
      attachments: mail.attachments ?? [],
    };

    try {
      await this.queue.add(MAIL_JOB, payload, {
        attempts: 6,
        backoff: { type: 'exponential', delay: 5_000 },
      });
      return { sent: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Could not queue "${mail.subject}": ${msg}`);
      return { sent: false, error: msg };
    }
  }

  private smtpConfigured(): boolean {
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_USER') &&
        this.config.get<string>('SMTP_PASS'),
    );
  }
}
