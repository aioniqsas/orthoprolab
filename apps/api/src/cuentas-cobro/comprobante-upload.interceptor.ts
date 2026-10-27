import {
  BadRequestException,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import multer from 'multer';
import type { Observable } from 'rxjs';
import { detectImageType } from '../catalogo/image-validation.js';

export type AllowedComprobanteType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';

export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;

/** Receipts are PDFs or photos; trust magic bytes, never the declared mimetype. */
export function detectComprobanteType(buffer: Buffer): AllowedComprobanteType | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'application/pdf';
  }
  return detectImageType(buffer);
}

/**
 * Parses a single multipart file field `comprobante` (max 5 MB) into memory
 * and lets the payment fields through. Guards run first, so only clinic users
 * ever reach the parser.
 */
@Injectable()
export class ComprobanteUploadInterceptor implements NestInterceptor {
  private readonly parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_COMPROBANTE_BYTES, files: 1, fields: 6, parts: 7 },
  }).single('comprobante');

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    await new Promise<void>((resolve, reject) => {
      this.parse(
        http.getRequest<Request>(),
        http.getResponse<Response>(),
        (err: unknown) => {
          if (!err) return resolve();
          const code = (err as { code?: string }).code;
          reject(
            new BadRequestException(
              code === 'LIMIT_FILE_SIZE'
                ? 'El comprobante supera el máximo de 5 MB.'
                : 'Solicitud de carga inválida: envía un único archivo en el campo "comprobante".',
            ),
          );
        },
      );
    });
    return next.handle();
  }
}
