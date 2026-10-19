import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CryptoService } from '../crypto/crypto.service.js';
import { cedulaHash } from '../crypto/cedula.js';
import { PasswordService } from '../crypto/password.service.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Rol } from '../usuarios/rol.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import {
  PUBLIC_REGISTRATION_ROLE,
  REGISTER_FAILURE_MESSAGE,
} from './auth.constants.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { LoginAttemptsService } from './login-attempts.service.js';
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
        const usuario = await manager.save(
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
        await manager.insert(Doctor, {
          usuarioId: usuario.id,
          clinicaId: null,
        });
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
      .where('lower(u.correo) = :correo', { correo: dto.correo })
      .getOne();

    const usable = user !== null && user.activo;
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
      relations: { rol: true },
    });
    if (!user?.activo) throw new UnauthorizedException();
    return toPublic(user);
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

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwords.hash('dummy-password-for-timing');
    return this.dummyHash;
  }
}
