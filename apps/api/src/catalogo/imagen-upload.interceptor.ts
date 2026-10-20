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
import { MAX_IMAGE_BYTES } from './image-validation.js';

/**
 * Parses a single multipart file field `imagen` into memory (max 5 MB, no
 * text fields). Every multer failure is a 400 (Nest's built-in interceptor
 * would answer 413 for oversize). Guards run before it, so only authorized
 * administrators ever reach the parser.
 */
@Injectable()
export class ImagenUploadInterceptor implements NestInterceptor {
  private readonly parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 1 },
  }).single('imagen');

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
                ? 'La imagen supera el maximo de 5 MB.'
                : 'Solicitud de carga invalida: envia un unico archivo en el campo "imagen".',
            ),
          );
        },
      );
    });
    return next.handle();
  }
}
