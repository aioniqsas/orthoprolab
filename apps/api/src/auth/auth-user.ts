import type { Request } from 'express';

/** What the JWT strategy attaches to `request.user`. */
export interface AuthUser {
  id: string;
  rol: string;
  /** Session family id (`sid` claim). */
  sid: string;
}

export type AuthenticatedRequest = Request & { user: AuthUser };
