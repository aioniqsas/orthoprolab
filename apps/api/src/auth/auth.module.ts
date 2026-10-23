import {
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../config/env.validation.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthCookies } from './cookies.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { RolesGuard } from './roles.guard.js';
import { SesionRefresco } from './sesion-refresco.entity.js';
import { SessionsService } from './sessions.service.js';

const LOGIN_REDIS = Symbol('LOGIN_REDIS');

/** Closes the lockout's Redis connection when the app shuts down. */
@Injectable()
class LoginRedisCloser implements OnApplicationShutdown {
  constructor(@Inject(LOGIN_REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}

/**
 * Authentication: JWT in an httpOnly cookie, rotating refresh sessions, login
 * lockout. JwtAuthGuard and RolesGuard are global (secure by default): routes
 * opt out with @Public() and restrict roles with @Roles(). Import this module
 * AFTER SecurityModule so rate limiting runs first.
 */
@Module({
  imports: [
    UsuariosModule,
    TypeOrmModule.forFeature([SesionRefresco]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        secret: Buffer.from(
          config.get('JWT_SECRET', { infer: true }),
          'base64',
        ),
        signOptions: {
          algorithm: 'HS256' as const,
          expiresIn: config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
        },
        verifyOptions: { algorithms: ['HS256' as const] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    JwtStrategy,
    LoginRedisCloser,
    {
      provide: LOGIN_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        new Redis({
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }),
          tls: config.get('REDIS_TLS', { infer: true }) ? {} : undefined,
          maxRetriesPerRequest: 2,
        }),
    },
    {
      provide: LoginAttemptsService,
      inject: [LOGIN_REDIS, ConfigService],
      useFactory: (redis: Redis, config: ConfigService<EnvConfig, true>) =>
        new LoginAttemptsService(redis, {
          maxAttempts: config.get('LOGIN_MAX_ATTEMPTS', { infer: true }),
          lockSeconds: config.get('LOGIN_LOCK_SECONDS', { infer: true }),
        }),
    },
    {
      provide: AuthCookies,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) =>
        new AuthCookies({
          secure: config.get('NODE_ENV', { infer: true }) === 'production',
          sameSite: config.get('COOKIE_SAMESITE', { infer: true }),
          accessTtlSeconds: config.get('ACCESS_TOKEN_TTL_SECONDS', {
            infer: true,
          }),
          refreshTtlDays: config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }),
        }),
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
