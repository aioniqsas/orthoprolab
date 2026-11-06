export const SYSTEM_QUEUE = 'system';
export const PING_JOB = 'ping';
export const SYSTEM_CONCURRENCY = 5;

/** Emails that could not be delivered inline. */
export const MAIL_QUEUE = 'mail';
export const MAIL_JOB = 'send';
export const MAIL_CONCURRENCY = 3;

/** HTTP requests a portal asked us to replay after a failure. */
export const HTTP_RETRY_QUEUE = 'http-retry';
export const HTTP_RETRY_JOB = 'replay';
export const HTTP_RETRY_CONCURRENCY = 3;

export const QUEUE_PREFIX = 'orthopro';

/** Redis client shared by the idempotency cache (BullMQ keeps its own). */
export const RETRY_REDIS = Symbol('RETRY_REDIS');
/** A replayed request must return the original answer for a full day. */
export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
