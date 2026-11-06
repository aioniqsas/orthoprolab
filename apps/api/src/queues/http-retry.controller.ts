import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { HttpRetryQueueService } from './http-retry.queue.service.js';
import { RetryRequestDto } from './http-retry.dto.js';

/**
 * A portal calls this after a mutating request failed. The replay runs as the
 * same user (its cookie is forwarded by this server, never accepted from the
 * body) and the request keeps its Idempotency-Key.
 */
@Controller('internal/retry')
export class HttpRetryController {
  constructor(private readonly queue: HttpRetryQueueService) {}

  @Post()
  @HttpCode(202)
  enqueue(@Body() dto: RetryRequestDto, @Req() req: Request) {
    return this.queue.enqueue(dto, req.headers.cookie ?? '');
  }
}
