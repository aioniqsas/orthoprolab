import type { Redis } from 'ioredis';

/** NestJS provider token for the Redis connection used by PdfService and cache invalidation. */
export const PDF_REDIS = Symbol('PDF_REDIS');

const KEY_PATTERN = 'orthopro:pdf:catalog:*';

/**
 * Deletes all PDF catalog cache keys.
 * Shared by PdfService and ServiciosService to avoid circular imports.
 */
export async function invalidatePdfCache(redis: Redis): Promise<void> {
  const keys = await redis.keys(KEY_PATTERN).catch(() => [] as string[]);
  if (keys.length > 0) await redis.del(...keys).catch(() => {});
}
