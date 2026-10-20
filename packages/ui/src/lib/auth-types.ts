export type AuthFailureKind =
  | "credentials"
  | "validation"
  | "rate-limited"
  | "unavailable"
  | "network";

export type AuthResult =
  | { ok: true }
  | {
      ok: false;
      kind: AuthFailureKind;
      /** Optional safe, user-facing message. Never pass raw server text here. */
      message?: string;
      /** Required for kind "rate-limited": seconds until the user may retry. */
      retryAfterSeconds?: number;
    };
