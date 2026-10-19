import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'orthopro:roles';

/** Restricts a route to the listed role names (checked by RolesGuard). */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
