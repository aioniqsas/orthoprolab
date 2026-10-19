import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.js';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Global guard (runs after JwtAuthGuard): routes with @Roles(...) require one
 * of those roles, read from the JWT. Routes without @Roles are unaffected.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<Request>().user as
      AuthUser | undefined;
    if (!user) throw new UnauthorizedException();
    if (!roles.includes(user.rol)) throw new ForbiddenException();
    return true;
  }
}
