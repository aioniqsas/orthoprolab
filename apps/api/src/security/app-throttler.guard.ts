import { Injectable, type ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerRequest,
} from '@nestjs/throttler';
import { STRICT_THROTTLE_KEY, THROTTLER_DEFAULT } from './throttle.js';

/**
 * Global throttler guard. Differences from the stock guard:
 * - Named throttlers other than `default` only apply to routes that opt in
 *   with @StrictThrottle(name).
 * - Blocked responses carry the standard `Retry-After` header (the stock guard
 *   suffixes it with the throttler name for non-default throttlers).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async handleRequest(
    props: ThrottlerRequest,
  ): Promise<boolean> {
    const { throttler, context } = props;
    if (throttler.name !== THROTTLER_DEFAULT) {
      const optedIn = this.reflector.getAllAndOverride<boolean | undefined>(
        STRICT_THROTTLE_KEY + throttler.name,
        [context.getHandler(), context.getClass()],
      );
      if (!optedIn) return true;
    }
    return super.handleRequest(props);
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const res = this.getRequestResponse(context).res;
    this.setResponseHeader(res, 'Retry-After', detail.timeToBlockExpire);
    return super.throwThrottlingException(context, detail);
  }
}
