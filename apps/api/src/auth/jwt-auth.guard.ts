import { ForbiddenException, Injectable, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { AuthUser } from './auth-user.js';

const BOT_ROUTES = [
  ['GET', /^\/mi-clinica\/ordenes$/], ['GET', /^\/mi-clinica\/ordenes\/[^/]+$/],
  ['GET', /^\/mi-clinica\/ordenes\/[^/]+\/control-trabajos$/], ['GET', /^\/mi-clinica\/doctores$/],
  ['GET', /^\/mi-clinica\/doctores\/[^/]+\/pacientes$/], ['GET', /^\/mi-clinica\/pacientes$/],
  ['POST', /^\/mi-clinica\/pacientes$/], ['GET', /^\/mi-clinica\/servicios$/],
  ['GET', /^\/mi-clinica\/cuentas-cobro$/], ['GET', /^\/mi-clinica\/cuentas-cobro\/[^/]+$/],
  ['POST', /^\/mi-clinica\/ordenes$/],
] as const;

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const accepted = await super.canActivate(context);
    const request = context.switchToHttp().getRequest<{ method: string; path: string; route?: { path?: string }; user?: AuthUser }>();
    if (request.user?.scope === 'whatsapp-bot') {
      // Se compara contra la ruta que Express ya resolvió; si no existe, el path
      // se normaliza y cualquier `%`, `\` o `..` deniega: el guard nunca es más
      // permisivo que el router.
      const raw = request.route?.path ?? request.path ?? '';
      const path = /[%\\]|\.\./.test(raw)
        ? '\u0000'
        : raw.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
      const allowed = BOT_ROUTES.some(([method, pattern]) => method === request.method && pattern.test(path));
      if (!allowed) throw new ForbiddenException();
    }
    return accepted as boolean;
  }
  override handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    if (err || !user) throw new UnauthorizedException();
    return user;
  }
}
