export type ApiErrorCode = "http" | "timeout" | "network";

/** Safe, generic Spanish fallbacks. Server text is never used as the message. */
const FALLBACKS: Record<number, string> = {
  400: "Revisa los datos ingresados.",
  401: "Tu sesión no es valida.",
  403: "No tienes permisos para esta acción.",
  429: "Demasiados intentos. Inténtalo de nuevo más tarde.",
  503: "El servicio no está disponible en este momento. Inténtalo de nuevo más tarde.",
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Validation messages from a 400 body, when present (raw server text). */
  readonly messages: string[];

  constructor(
    status: number,
    options: { code?: ApiErrorCode; messages?: string[]; message?: string } = {},
  ) {
    super(
      options.message ??
        FALLBACKS[status] ??
        "Ocurrió un error inesperado. Inténtalo de nuevo.",
    );
    this.name = "ApiError";
    this.status = status;
    this.code = options.code ?? "http";
    this.messages = options.messages ?? [];
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super(401);
    this.name = "UnauthorizedError";
  }
}

export const DEFAULT_RETRY_AFTER_SECONDS = 60;

export class RateLimitedError extends ApiError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(429);
    this.name = "RateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function parseRetryAfter(value: string | null): number {
  if (value !== null && /^\d+$/.test(value.trim())) {
    const n = Number(value);
    if (n > 0) return n;
  }
  if (value) {
    const at = Date.parse(value);
    if (!Number.isNaN(at)) {
      const s = Math.ceil((at - Date.now()) / 1000);
      if (s > 0) return s;
    }
  }
  return DEFAULT_RETRY_AFTER_SECONDS;
}
