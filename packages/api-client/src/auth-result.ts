import { ApiError, RateLimitedError, UnauthorizedError } from "./errors";

export type AuthFailureKind =
  | "credentials"
  | "validation"
  | "rate-limited"
  | "unavailable"
  | "network";

/** Structurally compatible with `AuthResult` from `@repo/ui/lib/auth-types`. */
export type AuthFailure =
  | { ok: false; kind: "rate-limited"; retryAfterSeconds: number }
  | { ok: false; kind: Exclude<AuthFailureKind, "rate-limited"> };

/** Maps any thrown value to a safe auth result; server text is never exposed. */
export function toAuthResult(error: unknown): AuthFailure {
  if (error instanceof RateLimitedError) {
    return { ok: false, kind: "rate-limited", retryAfterSeconds: error.retryAfterSeconds };
  }
  if (error instanceof UnauthorizedError) return { ok: false, kind: "credentials" };
  if (error instanceof ApiError) {
    if (error.code === "network" || error.code === "timeout") {
      return { ok: false, kind: "network" };
    }
    if (error.status === 400) return { ok: false, kind: "validation" };
  }
  return { ok: false, kind: "unavailable" };
}
