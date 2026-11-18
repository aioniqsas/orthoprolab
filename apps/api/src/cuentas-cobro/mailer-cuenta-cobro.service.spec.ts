import type { Queue } from 'bullmq';
import { CuentaCobroMailAttachmentsService } from './cuenta-cobro-mail-attachments.service.js';
import { MailerCuentaCobroService } from './mailer-cuenta-cobro.service.js';
import type { CuentaCobro } from './cuenta-cobro.entity.js';
import { MailProcessor } from '../queues/mail.processor.js';
import { MailQueueService } from '../queues/mail-queue.service.js';
import type { MailJobPayload, MailMessage } from '../queues/mail-queue.service.js';
import { MAIL_JOB } from '../queues/queues.constants.js';

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn(async (_opciones: unknown) => ({ accepted: [] as unknown[] }));
  return { sendMail, createTransport: vi.fn(() => ({ sendMail, close: vi.fn() })) };
});

vi.mock('nodemailer', () => ({ default: { createTransport } }));

const config = {
  get: (clave: string) =>
    ({
      SMTP_HOST: 'smtp.test',
      SMTP_PORT: 587,
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
      SMTP_FROM: 'lab@test',
    })[clave],
} as never;

const cuenta = {
  id: '1',
  numero: 'CC-2026-0001',
  total: '250000.00',
  pdfUrl: 'https://res.cloudinary.com/fake/cuenta.pdf',
  fechaEmision: null,
  fechaVencimiento: null,
  clinica: { nombre: 'Clinica Muelas Flojas' },
} as unknown as CuentaCobro;

const PDFS = [
  {
    filename: 'cuenta_CC_2026_0001.pdf',
    content: Buffer.from('%PDF-1.7 cuenta'),
    contentType: 'application/pdf' as const,
  },
  {
    filename: 'control-de-trabajos-orden-9.pdf',
    content: Buffer.from('%PDF-1.7 control-9'),
    contentType: 'application/pdf' as const,
  },
  {
    filename: 'control-de-trabajos-orden-12.pdf',
    content: Buffer.from('%PDF-1.7 control-12'),
    contentType: 'application/pdf' as const,
  },
];

function fakeAttachments() {
  return { attachmentsFor: vi.fn(async () => PDFS.map((pdf) => ({ ...pdf }))) };
}

/** Real MailQueueService over a fake BullMQ queue: inspects the real job. */
function queueWithCapture() {
  const add = vi.fn(async (_name: string, _payload: MailJobPayload) => ({ id: '1' }));
  const service = new MailQueueService(
    { add } as unknown as Queue,
    config,
  );
  const jobPayload = () => add.mock.calls[0]![1] as MailJobPayload;
  return { service, add, jobPayload };
}

describe('MailerCuentaCobroService.sendCuentaCobro · payload encolado', () => {
  it('queues the account id and no PDF bytes, so Redis keeps no base64', async () => {
    const { service: mailQueue, jobPayload } = queueWithCapture();
    const attachments = fakeAttachments();
    const mailer = new MailerCuentaCobroService(
      config,
      mailQueue,
      attachments as unknown as CuentaCobroMailAttachmentsService,
    );

    const result = await mailer.sendCuentaCobro(cuenta, 'clinica@test');

    expect(result).toEqual({ sent: true });
    const payload = jobPayload();
    expect(payload.attachments).toEqual([]);
    expect(payload.attachmentSource).toEqual({
      kind: 'cuenta-cobro',
      cuentaCobroId: '1',
    });
    const serializado = JSON.stringify(payload);
    expect(serializado).not.toContain(Buffer.from('%PDF-1.7 cuenta').toString('base64'));
    expect(serializado).not.toMatch(/contentBase64/);
    // A 6-PDF email used to add ~352 KB of base64 to the job.
    expect(Buffer.byteLength(serializado)).toBeLessThan(8_000);
    // The producer does not build the PDFs; the worker does.
    expect(attachments.attachmentsFor).not.toHaveBeenCalled();
  });

  it('keeps the subject and the recipient of the email', async () => {
    const { service: mailQueue, jobPayload } = queueWithCapture();
    const mailer = new MailerCuentaCobroService(
      config,
      mailQueue,
      fakeAttachments() as unknown as CuentaCobroMailAttachmentsService,
    );

    await mailer.sendCuentaCobro(cuenta, 'clinica@test');

    const payload = jobPayload();
    expect(payload.to).toEqual(['clinica@test']);
    expect(payload.subject).toBe('Cuenta de cobro CC-2026-0001 — OrthoPro Lab');
    expect(payload.html).toContain('Cuenta de cobro CC-2026-0001');
  });
});

describe('MailProcessor · adjuntos y reintentos', () => {
  const job = (): MailJobPayload => ({
    to: ['clinica@test'],
    subject: 'Cuenta de cobro CC-2026-0001 — OrthoPro Lab',
    text: null,
    html: '<p>Cuenta de cobro CC-2026-0001</p>',
    attachments: [],
    attachmentSource: { kind: 'cuenta-cobro', cuentaCobroId: '1' },
  });

  function buildProcessor(attachments: ReturnType<typeof fakeAttachments>) {
    return new MailProcessor(
      config,
      attachments as unknown as CuentaCobroMailAttachmentsService,
    );
  }

  it('delivers the account PDF and every control PDF to the recipient', async () => {
    sendMail.mockClear();
    const attachments = fakeAttachments();
    const processor = buildProcessor(attachments);

    await processor.process({ name: MAIL_JOB, data: job() } as never);

    const enviado = sendMail.mock.calls[0]![0] as {
      to: string;
      subject: string;
      attachments: { filename: string; content: Buffer }[];
    };
    expect(enviado.to).toBe('clinica@test');
    expect(enviado.subject).toBe('Cuenta de cobro CC-2026-0001 — OrthoPro Lab');
    expect(enviado.attachments.map((a) => a.filename)).toEqual(
      PDFS.map((pdf) => pdf.filename),
    );
    expect(enviado.attachments[0]!.content.equals(PDFS[0]!.content)).toBe(true);
    expect(enviado.attachments[2]!.content.equals(PDFS[2]!.content)).toBe(true);
    expect(attachments.attachmentsFor).toHaveBeenCalledWith('1');
  });

  it('rebuilds the same attachments on a retry: none lost, none duplicated', async () => {
    sendMail.mockClear();
    const attachments = fakeAttachments();
    const processor = buildProcessor(attachments);
    const data = job();

    await processor.process({ name: MAIL_JOB, data } as never);
    await processor.process({ name: MAIL_JOB, data } as never);

    expect(sendMail).toHaveBeenCalledTimes(2);
    for (const llamada of sendMail.mock.calls) {
      const enviado = llamada[0] as {
        attachments: { filename: string }[];
      };
      expect(enviado.attachments.map((a) => a.filename)).toEqual(
        PDFS.map((pdf) => pdf.filename),
      );
    }
    // Same job data both times: the retry never carries extra attachments.
    expect(JSON.stringify(data)).not.toMatch(/contentBase64|%PDF/);
  });

  it('still decodes inline attachments of other emails', async () => {
    sendMail.mockClear();
    const processor = buildProcessor(fakeAttachments());
    const mensaje: MailMessage = {
      to: 'clinica@test',
      subject: 'Otro correo',
      attachments: [{ filename: 'nota.txt', contentBase64: Buffer.from('hola').toString('base64') }],
    };

    await processor.process({
      name: MAIL_JOB,
      data: {
        to: ['clinica@test'],
        subject: mensaje.subject,
        text: null,
        html: null,
        attachments: mensaje.attachments,
      },
    } as never);

    const enviado = sendMail.mock.calls[0]![0] as {
      attachments: { filename: string; content: Buffer }[];
    };
    expect(enviado.attachments.map((a) => a.filename)).toEqual(['nota.txt']);
    expect(enviado.attachments[0]!.content.toString()).toBe('hola');
  });
});

describe('CuentaCobroMailAttachmentsService', () => {
  function build(opts: {
    cuenta?: Partial<CuentaCobro> | null;
    ordenes?: { id: string }[];
    adjuntas?: { ordenId: string }[];
    controlFalla?: boolean;
  }) {
    const cuentaRow =
      opts.cuenta === null
        ? null
        : {
            id: '1',
            numero: 'CC-2026-0001',
            total: '1.00',
            pdfUrl: 'https://res.cloudinary.com/fake/cuenta.pdf',
            clinica: { nombre: 'Clinica' },
            ...opts.cuenta,
          };
    const cuentaRepo = { findOne: vi.fn(async () => cuentaRow) };
    const ordenes = opts.ordenes ?? [{ id: '9' }, { id: '12' }];
    const cuentaOrdenRepo = {
      find: vi.fn(async () => opts.adjuntas ?? ordenes.map((o) => ({ ordenId: o.id }))),
    };
    const ordenRepo = { find: vi.fn(async () => ordenes) };
    const pdfCuenta = { generate: vi.fn(async () => Buffer.from('%PDF cuenta')) };
    const pdfControl = {
      generate: vi.fn(async (orden: { id: string }) => {
        if (opts.controlFalla && orden.id === '12') throw new Error('boom');
        return Buffer.from(`%PDF control ${orden.id}`);
      }),
    };
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from('%PDF almacenado'),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const service = new CuentaCobroMailAttachmentsService(
      cuentaRepo as never,
      cuentaOrdenRepo as never,
      ordenRepo as never,
      pdfCuenta as never,
      pdfControl as never,
    );
    return { service, pdfCuenta, pdfControl, fetchSpy };
  }

  it('builds the account PDF from its stored URL plus one control per order, in order', async () => {
    const { service, fetchSpy, pdfControl } = build({});

    const adjuntos = await service.attachmentsFor('1');

    expect(fetchSpy).toHaveBeenCalledWith('https://res.cloudinary.com/fake/cuenta.pdf');
    expect(adjuntos.map((a) => a.filename)).toEqual([
      'cuenta_CC_2026_0001.pdf',
      'control-de-trabajos-orden-9.pdf',
      'control-de-trabajos-orden-12.pdf',
    ]);
    expect(adjuntos[0]!.content.toString()).toBe('%PDF almacenado');
    expect(adjuntos[2]!.content.toString()).toBe('%PDF control 12');
    expect(pdfControl.generate).toHaveBeenCalledTimes(2);
  });

  it('generates the account PDF when the row has no stored URL', async () => {
    const { service, pdfCuenta, fetchSpy } = build({ cuenta: { pdfUrl: null } });

    const adjuntos = await service.attachmentsFor('1');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(pdfCuenta.generate).toHaveBeenCalledTimes(1);
    expect(adjuntos[0]!.content.toString()).toBe('%PDF cuenta');
  });

  it('skips a control PDF that fails instead of losing the whole email', async () => {
    const { service } = build({ controlFalla: true });

    const adjuntos = await service.attachmentsFor('1');

    expect(adjuntos.map((a) => a.filename)).toEqual([
      'cuenta_CC_2026_0001.pdf',
      'control-de-trabajos-orden-9.pdf',
    ]);
  });

  it('fails when the account does not exist', async () => {
    const { service } = build({ cuenta: null });

    await expect(service.attachmentsFor('404')).rejects.toThrow(
      /Cuenta de cobro 404 no encontrada/,
    );
  });
});
