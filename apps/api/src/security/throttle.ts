import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/** Throttler names registered in SecurityModule. */
export const THROTTLER_DEFAULT = 'default';
export const THROTTLER_LOGIN = 'login';
export const THROTTLER_REGISTER = 'register';

export type StrictThrottlerName =
  typeof THROTTLER_LOGIN | typeof THROTTLER_REGISTER;

export const STRICT_THROTTLE_KEY = 'orthopro:strict-throttle:';

/**
 * Opts a route into one of the stricter named throttlers (`login`,
 * `register`). They are inactive everywhere else; `default` always applies.
 * Optional overrides replace the module defaults for this route (ttl in ms).
 */
export function StrictThrottle(
  name: StrictThrottlerName,
  overrides: { limit?: number; ttl?: number; blockDuration?: number } = {},
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(STRICT_THROTTLE_KEY + name, true),
    Throttle({ [name]: overrides }),
  );
}
