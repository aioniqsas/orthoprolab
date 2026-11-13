import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { EnvConfig } from '../config/env.validation.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { cedulaHash } from '../crypto/cedula.js';
import { PasswordService } from '../crypto/password.service.js';
import { Rol } from '../usuarios/rol.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import {
  PUBLIC_REGISTRATION_ROLE,
  REGISTER_FAILURE_MESSAGE,
} from './auth.constants.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { MailerAuthService } from './mailer-auth.service.js';
import { SessionsService } from './sessions.service.js';

export interface UsuarioPublico {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
}

export type LoginResult =
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'invalid' }
  | {
      status: 'ok';
      usuario: UsuarioPublico;
      accessToken: string;
      refreshToken: string;
    };

const toPublic = (u: Usuario): UsuarioPublico => ({
  id: u.id,
  nombres: u.nombres,
  apellidos: u.apellidos,
  correo: u.correo,
  rol: u.rol.nombre,
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Valid bcrypt hash verified for unknown/inactive users (timing parity). */
  private dummyHash?: Promise<string>;

  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly passwords: PasswordService,
    private readonly crypto: CryptoService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
    private readonly attempts: LoginAttemptsService,
    private readonly mailerAuth: MailerAuthService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  /**
   * Every failure (taken email/cedula, race on the unique indexes, any server
   * error) is the same 503 so the response does not reveal which accounts
   * exist. The password is always hashed first so the cost is the same.
   */
  async register(dto: RegisterDto): Promise<void> {
    try {
      const passwordHash = await this.passwords.hash(dto.password);
      const exists = await this.usuarios
        .createQueryBuilder('u')
        .where('lower(u.correo) = :correo', { correo: dto.correo })
        .orWhere('u.cedulaHash = :hash', { hash: cedulaHash(dto.cedula) })
        .getExists();
      if (exists) throw new ServiceUnavailableException();

      await this.dataSource.transaction(async (manager) => {
        const rol = await manager.findOneByOrFail(Rol, {
          nombre: PUBLIC_REGISTRATION_ROLE,
        });
        await manager.save(
          manager.create(Usuario, {
            cedula: dto.cedula,
            nombres: dto.nombres,
            apellidos: dto.apellidos,
            correo: dto.correo,
            passwordHash,
            rolId: rol.id,
            activo: true,
          }),
        );
      });
    } catch (error) {
      // Never log the error message: unique-violation details carry the
      // submitted email/cedula.
      const code = (error as { code?: string })?.code;
      this.logger.warn(
        `Registration failed (${(error as Error)?.name ?? 'unknown'}${code ? `, ${code}` : ''})`,
      );
      throw new ServiceUnavailableException(REGISTER_FAILURE_MESSAGE);
    }
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const key = this.crypto.loginKey(dto.correo);

    const retryAfterSeconds = await this.attempts.lockedSeconds(key);
    if (retryAfterSeconds > 0) return { status: 'locked', retryAfterSeconds };

    const user = await this.usuarios
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.rol', 'rol')
      .leftJoinAndSelect('u.clinica', 'clinica')
      .where('lower(u.correo) = :correo', { correo: dto.correo })
      .getOne();

    const usable = user !== null && this.isUsable(user);
    const hash = usable ? user.passwordHash : await this.getDummyHash();
    const passwordOk = await this.passwords.verify(dto.password, hash);

    if (!usable || !passwordOk) {
      await this.attempts.recordFailure(key);
      return { status: 'invalid' };
    }

    await this.attempts.reset(key);
    const session = await this.sessions.create(user.id, user.rol.nombre);
    return {
      status: 'ok',
      usuario: toPublic(user),
      accessToken: await this.signAccessToken(session),
      refreshToken: session.refreshToken,
    };
  }

  async refresh(
    rawToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const result = await this.sessions.rotate(rawToken);
    if (result.status !== 'rotated') throw new UnauthorizedException();
    const user = await this.usuarios.findOne({
      where: { id: result.usuarioId },
      relations: { rol: true, clinica: true },
    });
    if (!user || !this.isUsable(user)) {
      // Kill the whole family so a deactivated account cannot keep rotating.
      await this.sessions.revokeAllForUser(result.usuarioId);
      throw new UnauthorizedException();
    }
    return {
      accessToken: await this.signAccessToken(result),
      refreshToken: result.refreshToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) await this.sessions.revokeByToken(rawToken);
  }

  async me(userId: string): Promise<UsuarioPublico> {
    const user = await this.usuarios.findOne({
      where: { id: userId },
      relations: { rol: true, clinica: true },
    });
    if (!user?.activo) throw new UnauthorizedException();
    // S2/S4: a deactivated clinic makes the session itself invalid (403,
    // consistent with the data endpoints that also answer 403).
    if (!this.isUsable(user)) throw new ForbiddenException();
    return toPublic(user);
  }

  /** A user of a deactivated clinic must not hold or reestablish a session. */
  private isUsable(user: Usuario): boolean {
    if (!user.activo) return false;
    if (user.clinicaId === null) return true; // administrador y similares
    return user.clinica?.activo === true;
  }

  private signAccessToken(session: {
    usuarioId: string;
    rol: string;
    familiaId: string;
  }): Promise<string> {
    return this.jwt.signAsync({
      sub: session.usuarioId,
      rol: session.rol,
      sid: session.familiaId,
    });
  }

  /**
   * Generates a password reset token, stores its SHA-256 hash, and emails the
   * link. Always returns { ok: true } to prevent user enumeration.
   */
  async forgotPassword(correo: string): Promise<{ ok: true }> {
    const user = await this.usuarios
      .createQueryBuilder('u')
      .where('lower(u.correo) = :correo', { correo: correo.toLowerCase() })
      .getOne();

    if (user && user.activo) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256')
        .update(rawToken)
        .digest('hex');

      user.resetTokenHash = tokenHash;
      user.resetTokenExpires = new Date(Date.now() + 3_600_000);
      await this.usuarios.save(user);

      const adminUrl = this.config.get('ADMIN_URL', { infer: true });
      const resetUrl = `${adminUrl}/restablecer-password?token=${rawToken}`;

      const { sent, error } = await this.mailerAuth.sendPasswordReset(
        user.correo,
        `${user.nombres} ${user.apellidos}`,
        resetUrl,
      );
      if (!sent) {
        this.logger.warn(
          `Password reset email not sent for ${user.id}: ${error ?? 'unknown'}`,
        );
      }
    }

    return { ok: true };
  }

  /** Validates a reset token and sets the new password. */
  async resetPassword(
    token: string,
    nuevaPassword: string,
  ): Promise<{ ok: true }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const user = await this.usuarios
      .createQueryBuilder('u')
      .where('u.resetTokenHash = :hash', { hash: tokenHash })
      .andWhere('u.resetTokenExpires > :now', { now: new Date() })
      .andWhere('u.activo = true')
      .getOne();

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    user.passwordHash = await this.passwords.hash(nuevaPassword);
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await this.usuarios.save(user);

    // Invalidate all active sessions so stolen cookies can't be reused.
    await this.sessions.revokeAllForUser(user.id);

    return { ok: true };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwords.hash('dummy-password-for-timing');
    return this.dummyHash;
  }
}
