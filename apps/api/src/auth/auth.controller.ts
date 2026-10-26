import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { NoStoreInterceptor, StrictThrottle } from '../security/index.js';
import type { AuthenticatedRequest } from './auth-user.js';
import { REFRESH_COOKIE } from './auth.constants.js';
import { AuthService, type UsuarioPublico } from './auth.service.js';
import { AuthCookies } from './cookies.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResetPasswordTokenDto } from './dto/reset-password-token.dto.js';
import { Public } from './public.decorator.js';

const refreshCookieOf = (req: Request): string | undefined => {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[
    REFRESH_COOKIE
  ];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

@UseInterceptors(NoStoreInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookies,
  ) {}

  @Public()
  @StrictThrottle('login')
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ usuario: UsuarioPublico }> {
    const result = await this.auth.login(dto);
    if (result.status === 'locked') {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new HttpException(
        {
          statusCode: 429,
          message: 'Too many attempts. Try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (result.status === 'invalid') {
      throw new UnauthorizedException('Invalid credentials');
    }
    this.cookies.setAccess(res, result.accessToken);
    this.cookies.setRefresh(res, result.refreshToken);
    return { usuario: result.usuario };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const token = refreshCookieOf(req);
    try {
      if (!token) throw new UnauthorizedException();
      const tokens = await this.auth.refresh(token);
      this.cookies.setAccess(res, tokens.accessToken);
      this.cookies.setRefresh(res, tokens.refreshToken);
      return { message: 'Sesion renovada.' };
    } catch (error) {
      if (error instanceof UnauthorizedException) this.cookies.clearAll(res);
      throw error;
    }
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(refreshCookieOf(req));
    this.cookies.clearAll(res);
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest): Promise<UsuarioPublico> {
    return this.auth.me(req.user.id);
  }

  @Public()
  @StrictThrottle('login')
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ ok: true }> {
    return this.auth.forgotPassword(dto.correo);
  }

  @Public()
  @StrictThrottle('login')
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(
    @Body() dto: ResetPasswordTokenDto,
  ): Promise<{ ok: true }> {
    return this.auth.resetPassword(dto.token, dto.nuevaPassword);
  }
}
