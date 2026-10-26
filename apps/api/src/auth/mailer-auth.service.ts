import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

export interface EnviarAuthResult {
  sent: boolean;
  error?: string;
}

@Injectable()
export class MailerAuthService {
  private readonly logger = new Logger(MailerAuthService.name);

  constructor(private readonly config: ConfigService) {}

  async sendWelcome(
    to: string,
    nombre: string,
    correo: string,
    password: string,
  ): Promise<EnviarAuthResult> {
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

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
  h2 { color: #1a1a2e; }
  .credentials { background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; }
  .label { font-size: 0.85rem; color: #666; margin-bottom: 2px; }
  .value { font-weight: bold; font-size: 1rem; }
  .footer { font-size: 0.8rem; color: #888; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <h2>Bienvenido a OrthoPro Lab</h2>
  <p>Hola <strong>${nombre}</strong>,</p>
  <p>Tu cuenta ha sido creada exitosamente. A continuación encontrarás tus credenciales de acceso:</p>
  <div class="credentials">
    <p class="label">Correo electrónico:</p>
    <p class="value">${correo}</p>
    <p class="label" style="margin-top:12px;">Contraseña temporal:</p>
    <p class="value">${password}</p>
  </div>
  <p>Por seguridad, te recomendamos cambiar tu contraseña la primera vez que ingreses.</p>
  <p>Saludos,<br><strong>OrthoPro Lab</strong></p>
  <div class="footer">Este mensaje fue generado automáticamente. Por favor no respondas a este correo.</div>
</body>
</html>`;

    try {
      await transport.sendMail({
        from,
        to,
        subject: 'Bienvenido a OrthoPro Lab — tus credenciales de acceso',
        html,
      });
      return { sent: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send welcome email to ${to}: ${msg}`);
      return { sent: false, error: msg };
    }
  }

  async sendPasswordReset(
    to: string,
    nombre: string,
    resetUrl: string,
  ): Promise<EnviarAuthResult> {
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

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
  h2 { color: #1a1a2e; }
  .btn { display: inline-block; background: #1a1a2e; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0; }
  .note { font-size: 0.85rem; color: #666; }
  .footer { font-size: 0.8rem; color: #888; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <h2>Restablece tu contraseña</h2>
  <p>Hola <strong>${nombre}</strong>,</p>
  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el enlace a continuación para continuar:</p>
  <a href="${resetUrl}" class="btn">Restablecer contraseña</a>
  <p class="note">Este enlace es válido por 1 hora. Si no solicitaste el restablecimiento, puedes ignorar este mensaje.</p>
  <p>Saludos,<br><strong>OrthoPro Lab</strong></p>
  <div class="footer">Este mensaje fue generado automáticamente. Por favor no respondas a este correo.</div>
</body>
</html>`;

    try {
      await transport.sendMail({
        from,
        to,
        subject: 'Restablece tu contraseña — OrthoPro Lab',
        html,
      });
      return { sent: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send password reset email to ${to}: ${msg}`);
      return { sent: false, error: msg };
    }
  }
}
