const MAX_LENGTH = 2048;
const MAX_DECODE_PASSES = 3;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

function isSafeRelative(value: string): boolean {
  if (!value.startsWith("/")) return false;
  // "//host" and "/\host" are treated as network-path references by browsers.
  if (value[1] === "/" || value[1] === "\\") return false;
  if (value.includes("\\")) return false;
  return !CONTROL_CHARS.test(value);
}

/**
 * Returns `next` only when it is a same-origin relative path; otherwise `fallback`.
 * Encoded variants are checked after up to three decoding passes, so `%2f%2f`
 * and `%252f` cannot smuggle a protocol-relative URL past the check.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (typeof next !== "string" || next.length === 0 || next.length > MAX_LENGTH) {
    return fallback;
  }
  let current = next;
  for (let pass = 0; pass <= MAX_DECODE_PASSES; pass++) {
    if (!isSafeRelative(current)) return fallback;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return fallback;
    }
    if (decoded === current) return next;
    current = decoded;
  }
  return fallback;
}
